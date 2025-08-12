import * as core from '@actions/core'

import {
  ApiType,
  CreateAppFromBinaryResource,
  FastEdgeClient,
  GetBinaryResponse,
  UpdateAppResource,
  UploadBinaryResponse
} from './api-utils/index.js'
import { createAppResourceFromInputs, hasWasmBinaryChanged } from './utils.js'

/**
 * The main function for the action.
 *
 * @returns Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    const apiKey: string = core.getInput('api_key')
    core.debug(`API Key: ${apiKey}`)
    const apiUrl: string = core.getInput('api_url')

    // Create a FastEdge API client instance
    const fastEdgeClient = new FastEdgeClient(apiKey, apiUrl)

    // Check if the app exists
    const appName: string = core.getInput('app_name')
    const appId: string = core.getInput('app_id')

    let app
    if (appId && appId !== '0') {
      app = await fastEdgeClient.apps.get(appId).includeBinary()
    } else if (appName) {
      try {
        app = await fastEdgeClient.apps.getByName(appName).includeBinary()
      } catch {
        core.debug(
          `Application with name "${appName}" not found - proceed with creating new application`
        )
      }
    }
    if (!app) {
      // Create a new application
      const binary = await fastEdgeClient.binaries.upload(
        core.getInput('wasm_file')
      )

      const appResource = {
        ...createAppResourceFromInputs(),
        binary: binary.id
      } as CreateAppFromBinaryResource

      const createdApp = await fastEdgeClient.apps.create(appResource)
      core.notice(`Application created with ID: ${createdApp.id}`)
      core.setOutput('app_id', createdApp.id)
      core.setOutput('binary_id', createdApp.binary)
      return
    }

    console.log('Farq: app already exists, TRY updating...')
    let binary: GetBinaryResponse | UploadBinaryResponse = app.binary
    if (!app.binary.checksum || hasWasmBinaryChanged(app.binary.checksum)) {
      core.debug('Binary has changed, uploading new binary...')
      binary = await fastEdgeClient.binaries.upload(core.getInput('wasm_file'))
    }
    const appResource = {
      ...createAppResourceFromInputs(),
      binary: binary.id,
      id: app.id
    } as UpdateAppResource

    console.log('Farq: UPDATE appResource', appResource)

    const updatedApp = await fastEdgeClient.apps.update(appResource)
    core.notice(`Application updated with ID: ${updatedApp.id}`)
    core.setOutput('app_id', updatedApp.id)
    core.setOutput('binary_id', updatedApp.binary)
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  }
}
