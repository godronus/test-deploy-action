import path from 'node:path'
import fs from 'node:fs'
import crypto from 'node:crypto'

import { BinaryResponse } from './types.js'

/**
 * Checks for binary changes and deploys the new binary if changes are detected.
 *
 * @param wasmFile The path to the WASM binary file to deploy.
 * @returns Resolves with a BinaryResponse.
 */
async function deployBinary(wasmFile: string): Promise<BinaryResponse> {
  const wasmPath = path.normalize(wasmFile)

  // Calculate the checksum of the WASM file
  const wasmBuffer = fs.readFileSync(wasmPath)
  const checksum = crypto.createHash('md5').update(wasmBuffer).digest('hex')

  console.log('Farq: checksum', checksum)
}

export { deployBinary }
