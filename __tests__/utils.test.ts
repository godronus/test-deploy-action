import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

// jest.unstable_mockModule('@actions/core', () => core)

const mockGetInput = jest.fn<(name: string) => string>()
const mockWarning = jest.fn()

jest.unstable_mockModule('@actions/core', () => ({
  getInput: mockGetInput,
  warning: mockWarning,
  info: jest.fn(),
  debug: jest.fn(),
  error: jest.fn(),
  setOutput: jest.fn(),
  setFailed: jest.fn()
}))

await import('@actions/core')
const { createAppResourceFromInputs, hasWasmBinaryChanged } = await import(
  '../src/utils.js'
)

describe('Utils functions', () => {
  beforeEach(() => {
    jest.resetAllMocks()
  })

  describe('createAppResourceFromInputs', () => {
    it('creates app resource with all valid inputs', () => {
      mockGetInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          app_name: 'test-app',
          env: '{"ENVIRONMENT": "production", "LOG_LEVEL": "info"}',
          rsp_headers:
            '{"Content-Type": "application/json", "Cache-Control": "no-cache"}',
          comment: 'Test application deployment'
        }
        return inputs[name] || ''
      })

      const result = createAppResourceFromInputs()

      expect(result).toEqual({
        name: 'test-app',
        status: 1,
        env: {
          ENVIRONMENT: 'production',
          LOG_LEVEL: 'info'
        },
        rsp_headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        },
        comment: 'Test application deployment'
      })
    })

    it('creates app resource with minimal inputs', () => {
      mockGetInput.mockImplementation((name: string) => {
        return name === 'app_name' ? 'minimal-app' : ''
      })

      const result = createAppResourceFromInputs()

      expect(result).toEqual({
        name: 'minimal-app',
        status: 1,
        env: {},
        rsp_headers: {},
        comment: ''
      })
    })

    it('handles empty JSON inputs gracefully', () => {
      mockGetInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          app_name: 'empty-json-app',
          env: '{}',
          rsp_headers: '{}',
          comment: ''
        }
        return inputs[name] || ''
      })

      const result = createAppResourceFromInputs()

      expect(result).toEqual({
        name: 'empty-json-app',
        status: 1,
        env: {},
        rsp_headers: {},
        comment: ''
      })
    })

    it('handles invalid JSON in env input with warning', () => {
      mockGetInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          app_name: 'invalid-json-app',
          env: 'invalid json string',
          rsp_headers: '{"valid": "json"}',
          comment: 'Test comment'
        }
        return inputs[name] || ''
      })

      const result = createAppResourceFromInputs()

      expect(result).toEqual({
        name: 'invalid-json-app',
        status: 1,
        env: {},
        rsp_headers: { valid: 'json' },
        comment: 'Test comment'
      })
      expect(mockWarning).toHaveBeenCalledWith(
        'Failed to parse input as JSON: env. Using empty object instead.'
      )
    })

    it('handles invalid JSON in rsp_headers input with warning', () => {
      mockGetInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          app_name: 'invalid-headers-app',
          env: '{"NODE_ENV": "test"}',
          rsp_headers: '{invalid json}',
          comment: ''
        }
        return inputs[name] || ''
      })

      const result = createAppResourceFromInputs()

      expect(result).toEqual({
        name: 'invalid-headers-app',
        status: 1,
        env: { NODE_ENV: 'test' },
        rsp_headers: {},
        comment: ''
      })
      expect(mockWarning).toHaveBeenCalledWith(
        'Failed to parse input as JSON: rsp_headers. Using empty object instead.'
      )
    })

    it('handles whitespace-only JSON inputs', () => {
      mockGetInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          app_name: 'whitespace-app',
          env: '   ',
          rsp_headers: '\t\n  ',
          comment: 'Whitespace test'
        }
        return inputs[name] || ''
      })

      const result = createAppResourceFromInputs()

      expect(result).toEqual({
        name: 'whitespace-app',
        status: 1,
        env: {},
        rsp_headers: {},
        comment: 'Whitespace test'
      })
    })

    it('handles complex nested JSON structures', () => {
      mockGetInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          app_name: 'complex-app',
          env: '{"DATABASE": "postgresql://localhost", "FEATURES": "auth,logging"}',
          rsp_headers:
            '{"X-Custom": "value", "Access-Control-Allow-Origin": "*"}',
          comment: 'Complex configuration test'
        }
        return inputs[name] || ''
      })

      const result = createAppResourceFromInputs()

      expect(result).toEqual({
        name: 'complex-app',
        status: 1,
        env: {
          DATABASE: 'postgresql://localhost',
          FEATURES: 'auth,logging'
        },
        rsp_headers: {
          'X-Custom': 'value',
          'Access-Control-Allow-Origin': '*'
        },
        comment: 'Complex configuration test'
      })
    })
  })

  describe('hasWasmBinaryChanged', () => {
    const mockWasmPath = '/path/to/test.wasm'
    const mockWasmBuffer = Buffer.from('mock wasm binary content')
    const expectedChecksum = crypto
      .createHash('md5')
      .update(mockWasmBuffer)
      .digest('hex')

    beforeEach(() => {
      mockGetInput.mockImplementation(() => mockWasmPath)
      jest.spyOn(path, 'normalize').mockReturnValue(mockWasmPath)
      jest.spyOn(fs, 'readFileSync').mockReturnValue(mockWasmBuffer)
    })

    it('returns false when checksums match', () => {
      const result = hasWasmBinaryChanged(expectedChecksum)

      expect(result).toBe(false)
      expect(mockGetInput).toHaveBeenCalledWith('wasm_file')
      expect(path.normalize).toHaveBeenCalledWith(mockWasmPath)
      expect(fs.readFileSync).toHaveBeenCalledWith(mockWasmPath)
    })

    it('returns true when checksums do not match', () => {
      const differentChecksum = 'different-checksum-value'

      const result = hasWasmBinaryChanged(differentChecksum)

      expect(result).toBe(true)
      expect(mockGetInput).toHaveBeenCalledWith('wasm_file')
      expect(path.normalize).toHaveBeenCalledWith(mockWasmPath)
      expect(fs.readFileSync).toHaveBeenCalledWith(mockWasmPath)
    })

    it('handles different file paths correctly', () => {
      const differentPath = '/different/path/app.wasm'
      const normalizedPath = '/normalized/different/path/app.wasm'

      mockGetInput.mockImplementation(() => differentPath)
      jest.spyOn(path, 'normalize').mockReturnValue(normalizedPath)

      hasWasmBinaryChanged('some-checksum')

      expect(mockGetInput).toHaveBeenCalledWith('wasm_file')
      expect(path.normalize).toHaveBeenCalledWith(differentPath)
      expect(fs.readFileSync).toHaveBeenCalledWith(normalizedPath)
    })

    it('handles relative paths through normalization', () => {
      const relativePath = './src/../dist/app.wasm'
      const normalizedPath = 'dist/app.wasm'

      mockGetInput.mockImplementation(() => relativePath)
      jest.spyOn(path, 'normalize').mockReturnValue(normalizedPath)

      hasWasmBinaryChanged('some-checksum')

      expect(path.normalize).toHaveBeenCalledWith(relativePath)
      expect(fs.readFileSync).toHaveBeenCalledWith(normalizedPath)
    })

    it('generates consistent checksums for identical content', () => {
      const identicalBuffer = Buffer.from('mock wasm binary content')
      jest.spyOn(fs, 'readFileSync').mockReturnValue(identicalBuffer)

      const result1 = hasWasmBinaryChanged('different-checksum')
      const result2 = hasWasmBinaryChanged('different-checksum')

      expect(result1).toBe(result2)
      expect(result1).toBe(true)
    })

    it('throws error when file cannot be read', () => {
      jest.spyOn(fs, 'readFileSync').mockImplementation(() => {
        throw new Error('File not found')
      })

      expect(() => hasWasmBinaryChanged('some-checksum')).toThrow(
        'File not found'
      )
    })

    it('handles empty file content', () => {
      const emptyBuffer = Buffer.alloc(0)
      const emptyChecksum = crypto
        .createHash('md5')
        .update(emptyBuffer)
        .digest('hex')

      jest.spyOn(fs, 'readFileSync').mockReturnValue(emptyBuffer)

      const result = hasWasmBinaryChanged(emptyChecksum)

      expect(result).toBe(false)
    })

    it('handles binary content with special characters', () => {
      const binaryBuffer = Buffer.from([
        0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00
      ]) // WASM magic number
      const binaryChecksum = crypto
        .createHash('md5')
        .update(binaryBuffer)
        .digest('hex')

      jest.spyOn(fs, 'readFileSync').mockReturnValue(binaryBuffer)

      const result = hasWasmBinaryChanged(binaryChecksum)

      expect(result).toBe(false)
    })
  })
})
