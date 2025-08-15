import * as core from '@actions/core'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

import type { CreateAppResource } from '../api-utils/types.js'

type DictionaryInput = 'env' | 'rsp_headers'

type SecretEntry = {
  id: number
}

function parseDictionaryInput(input: DictionaryInput): Record<string, string> {
  try {
    const inputString = core.getInput(input) || '{}'
    const dict = JSON.parse(inputString.trim())
    if (typeof dict !== 'object' || dict === null || Array.isArray(dict)) {
      core.warning(`Input "${input}" is not a valid JSON dictionary object.`)
      return {}
    }
    const parsedDict = Object.entries(dict).reduce(
      (acc, [key, value]) => {
        if (typeof value !== 'string') {
          core.warning(
            `Value for key "${key}" in input "${input}" is not a string.`
          )
          acc[key] = ''
          return acc
        }
        acc[key] = value
        return acc
      },
      {} as Record<string, string>
    )
    return parsedDict
  } catch {
    core.warning(
      `Failed to parse input as JSON: ${input}. Using empty object instead.`
    )
    return {}
  }
}

/**
 * Type guard to validate if an object is a valid Secret entry
 */
function isValidSecretEntry(entry: unknown): entry is SecretEntry {
  return (
    typeof entry === 'object' &&
    entry !== null &&
    typeof (entry as SecretEntry).id === 'number'
  )
}

function parseSecretsInput(): Record<string, SecretEntry> {
  try {
    const inputString = core.getInput('secrets') || '{}'
    const secrets = JSON.parse(inputString.trim())
    if (
      typeof secrets !== 'object' ||
      secrets === null ||
      Array.isArray(secrets)
    ) {
      core.warning(`Input "secrets" is not a valid JSON secrets object.`)
      return {}
    }
    const isValid = Object.values(secrets).every(isValidSecretEntry)
    if (!isValid) {
      core.warning(
        `Failed to validate secrets input. Each secret must be an object with 'id' property set as a number.`
      )
      return {}
    }
    // Strip everything except the id from each secret entry
    return Object.entries(secrets).reduce(
      (acc, [key, value]) => {
        acc[key] = { id: (value as SecretEntry).id }
        return acc
      },
      {} as Record<string, SecretEntry>
    )
  } catch {
    core.warning(
      `Failed to parse input as JSON: secrets. Using empty object instead.`
    )
    return {}
  }
}

/**
 * Creates an application resource from the action inputs.
 */

function createAppResourceFromInputs(): Partial<CreateAppResource> {
  return {
    name: core.getInput('app_name'),
    status: 1,
    env: parseDictionaryInput('env'),
    rsp_headers: parseDictionaryInput('rsp_headers'),
    secrets: parseSecretsInput(),
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
