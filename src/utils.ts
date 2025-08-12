import * as core from '@actions/core'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

import type {
  CreateAppFromBinaryResource,
  CreateAppFromTemplateResource
} from './api-utils/types.js'

type DictionaryInput = 'env' | 'rsp_headers' | 'secrets'

function parseDictionaryInput(input: DictionaryInput): Record<string, string> {
  try {
    const inputString = core.getInput(input) || '{}'
    return JSON.parse(inputString.trim())
  } catch {
    core.warning(
      `Failed to parse input as JSON: ${input}. Using empty object instead.`
    )
    return {}
  }
}

/**
 * Creates an application resource from the action inputs.
 */

function createAppResourceFromInputs(): Partial<
  CreateAppFromBinaryResource | CreateAppFromTemplateResource
> {
  return {
    name: core.getInput('app_name'),
    status: 1,
    env: parseDictionaryInput('env'),
    rsp_headers: parseDictionaryInput('rsp_headers'),
    // secrets: parseDictionaryInput('secrets'),
    comment: core.getInput('comment') || ''
  }
}

/**
 * Checks if the current WASM binary has changed compared to a known hash on the api.
 * @param knownHash - The hash of the known binary. (Response from the API)
 * @return boolean - True if the binary has changed, false otherwise.
 */

function hasWasmBinaryChanged(knownHash: string): boolean {
  const normalizedPath = path.normalize(core.getInput('wasm_file'))
  const wasmBuffer = fs.readFileSync(normalizedPath)
  const checksum = crypto.createHash('md5').update(wasmBuffer).digest('hex')
  return checksum !== knownHash
}

export { createAppResourceFromInputs, hasWasmBinaryChanged }
