import * as core from '@actions/core'

import { FastEdgeClient } from './api-utils/index.js'

/**
 * The main function for the action.
 *
 * @returns Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    const apiKey: string = core.getInput('api_key')
    core.debug(`API Key: ${apiKey}`) // Debugging API key input
    const apiUrl: string = core.getInput('api_url')

    // Create a FastEdge API client instance
    const fastEdgeClient = new FastEdgeClient(apiKey, apiUrl)

    // Check if the app exists
    const appName: string = core.getInput('app_name')
    const appId: string = core.getInput('app_id')

    let app
    if (appId && appId !== '0') {
      app = await fastEdgeClient.apps.get(appId).includeBinary()
    }
    console.log('Farq: app', app)

    // const wasmFile: string = core.getInput('wasm_file')

    // const binary = await deployBinary(wasmFile)
    // Debug logs are only output if the `ACTIONS_STEP_DEBUG` secret is true
    // core.debug(`Waiting ${ms} milliseconds ...`)

    // Log the current timestamp, wait, then log the new timestamp
    core.debug(new Date().toTimeString())
    core.debug(new Date().toTimeString())

    // Set outputs for other workflow steps to use
    core.setOutput('time', new Date().toTimeString())
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  }
}
