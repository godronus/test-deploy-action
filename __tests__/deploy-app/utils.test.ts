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
  '../../src/deploy-app/utils.js'
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
          comment: 'Test application deployment',
          env: '{"ENVIRONMENT": "production", "LOG_LEVEL": "info"}',
          rsp_headers:
            '{"Content-Type": "application/json", "Cache-Control": "no-cache"}',
          secrets: '{"API_KEY": {"id": 1}}'
        }
        return inputs[name] || ''
      })

      const result = createAppResourceFromInputs()

      expect(result).toEqual({
        name: 'test-app',
        status: 1,
        comment: 'Test application deployment',
        env: {
          ENVIRONMENT: 'production',
          LOG_LEVEL: 'info'
        },
        rsp_headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        },
        secrets: {
          API_KEY: { id: 1 }
        }
      })
    })

    it('creates app resource with minimal inputs', () => {
      mockGetInput.mockImplementation((name: string) => {
        return name === 'app_name' ? 'minimal-app' : ''
      })

      const result = createAppResourceFromInputs()

      expect(result).toEqual({
        name: 'minimal-app',
        comment: '',
        status: 1,
        env: {},
        rsp_headers: {},
        secrets: {}
      })
    })

    it('handles empty JSON inputs gracefully', () => {
      mockGetInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          app_name: 'empty-json-app',
          comment: '',
          env: '{}',
          rsp_headers: '{}',
          secrets: '{}'
        }
        return inputs[name] || ''
      })

      const result = createAppResourceFromInputs()

      expect(result).toEqual({
        name: 'empty-json-app',
        comment: '',
        status: 1,
        env: {},
        rsp_headers: {},
        secrets: {}
      })
    })

    it('handles invalid JSON in env input with warning', () => {
      mockGetInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          app_name: 'invalid-json-app',
          comment: 'Test comment',
          env: 'invalid json string',
          rsp_headers: '{"valid": "json"}',
          secrets: '{}'
        }
        return inputs[name] || ''
      })

      const result = createAppResourceFromInputs()

      expect(result).toEqual({
        name: 'invalid-json-app',
        comment: 'Test comment',
        status: 1,
        env: {},
        rsp_headers: { valid: 'json' },
        secrets: {}
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
          comment: '',
          secrets: '{}'
        }
        return inputs[name] || ''
      })

      const result = createAppResourceFromInputs()

      expect(result).toEqual({
        name: 'invalid-headers-app',
        status: 1,
        env: { NODE_ENV: 'test' },
        rsp_headers: {},
        comment: '',
        secrets: {}
      })
      expect(mockWarning).toHaveBeenCalledWith(
        'Failed to parse input as JSON: rsp_headers. Using empty object instead.'
      )
    })

    it('handles invalid JSON in secrets input with warning', () => {
      mockGetInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          app_name: 'invalid-headers-app',
          env: '{"NODE_ENV": "test"}',
          rsp_headers: '{"Content-Type": "application/json"}',
          comment: '',
          secrets: '{invalid json}'
        }
        return inputs[name] || ''
      })

      const result = createAppResourceFromInputs()

      expect(result).toEqual({
        name: 'invalid-headers-app',
        status: 1,
        env: { NODE_ENV: 'test' },
        rsp_headers: { 'Content-Type': 'application/json' },
        comment: '',
        secrets: {}
      })
      expect(mockWarning).toHaveBeenCalledWith(
        'Failed to parse input as JSON: secrets. Using empty object instead.'
      )
    })

    it('handles invalid dictionary structure in secrets input with warning', () => {
      mockGetInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          app_name: 'invalid-headers-app',
          env: '{"NODE_ENV": "test"}',
          rsp_headers: '{}',
          comment: '',
          secrets: '{"database-password": "some_secret_password}'
        }
        return inputs[name] || ''
      })

      const result = createAppResourceFromInputs()

      expect(result).toEqual({
        name: 'invalid-headers-app',
        status: 1,
        env: { NODE_ENV: 'test' },
        rsp_headers: {},
        comment: '',
        secrets: {}
      })
      expect(mockWarning).toHaveBeenCalledWith(
        'Failed to parse input as JSON: secrets. Using empty object instead.'
      )
    })

    it('handles invalid secrets structure in secrets input with warning', () => {
      mockGetInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          app_name: 'invalid-headers-app',
          env: '{"NODE_ENV": "test"}',
          rsp_headers: '{}',
          comment: '',
          secrets: '{"database-password": {"id": "123"}}'
        }
        return inputs[name] || ''
      })

      const result = createAppResourceFromInputs()

      expect(result).toEqual({
        name: 'invalid-headers-app',
        status: 1,
        env: { NODE_ENV: 'test' },
        rsp_headers: {},
        comment: '',
        secrets: {}
      })
      expect(mockWarning).toHaveBeenCalledWith(
        "Failed to validate secrets input. Each secret must be an object with 'id' property set as a number."
      )
    })

    it('handles invalid secrets structure. i.e. strips excess fields', () => {
      mockGetInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          app_name: 'invalid-headers-app',
          env: '{"NODE_ENV": "test"}',
          rsp_headers: '{}',
          comment: '',
          secrets:
            '{"database-password": {"id": 123 , "value": "some_secret_password"}}'
        }
        return inputs[name] || ''
      })

      const result = createAppResourceFromInputs()

      expect(result).toEqual({
        name: 'invalid-headers-app',
        status: 1,
        env: { NODE_ENV: 'test' },
        rsp_headers: {},
        comment: '',
        secrets: { 'database-password': { id: 123 } }
      })
    })

    it('handles correct secret structure in secrets input', () => {
      mockGetInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          app_name: 'invalid-headers-app',
          env: '{"NODE_ENV": "test"}',
          rsp_headers: '{}',
          comment: '',
          secrets: '{"database-password": { "id": 123 }}'
        }
        return inputs[name] || ''
      })

      const result = createAppResourceFromInputs()

      expect(result).toEqual({
        name: 'invalid-headers-app',
        status: 1,
        env: { NODE_ENV: 'test' },
        rsp_headers: {},
        comment: '',
        secrets: { 'database-password': { id: 123 } }
      })
    })

    it('handles whitespace-only JSON inputs', () => {
      mockGetInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          app_name: 'whitespace-app',
          env: '   ',
          rsp_headers: '\t\n  ',
          comment: 'Whitespace test',
          secrets: '\t\n  '
        }
        return inputs[name] || ''
      })

      const result = createAppResourceFromInputs()

      expect(result).toEqual({
        name: 'whitespace-app',
        status: 1,
        env: {},
        rsp_headers: {},
        comment: 'Whitespace test',
        secrets: {}
      })
    })

    it('handles complex nested JSON structures', () => {
      mockGetInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          app_name: 'complex-app',
          env: '{"DATABASE": "postgresql://localhost", "FEATURES": "auth,logging"}',
          rsp_headers:
            '{"X-Custom": "value", "Access-Control-Allow-Origin": "*"}',
          comment: 'Complex configuration test',
          secrets: '{}'
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
        comment: 'Complex configuration test',
        secrets: {}
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

  describe('parseDictionaryInput', () => {
    it('parses valid dictionary input correctly', () => {
      mockGetInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          env: JSON.stringify({
            NODE_ENV: 'production',
            API_URL: 'https://api.example.com',
            DEBUG: 'false'
          })
        }
        return inputs[name] || ''
      })

      // Access the function via createAppResourceFromInputs result
      const result = createAppResourceFromInputs()

      expect(result.env).toEqual({
        NODE_ENV: 'production',
        API_URL: 'https://api.example.com',
        DEBUG: 'false'
      })
    })

    it('handles non-string values with warning and converts to empty string', () => {
      mockGetInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          rsp_headers: JSON.stringify({
            'Content-Type': 'application/json',
            'Cache-Control': 3600, // Non-string value
            'X-Custom-Header': true // Non-string value
          })
        }
        return inputs[name] || ''
      })

      const result = createAppResourceFromInputs()

      expect(result.rsp_headers).toEqual({
        'Content-Type': 'application/json',
        'Cache-Control': '',
        'X-Custom-Header': ''
      })
      expect(mockWarning).toHaveBeenCalledWith(
        'Value for key "Cache-Control" in input "rsp_headers" is not a string.'
      )
      expect(mockWarning).toHaveBeenCalledWith(
        'Value for key "X-Custom-Header" in input "rsp_headers" is not a string.'
      )
    })

    it('handles invalid JSON with warning and returns empty object', () => {
      mockGetInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          env: '{invalid json}'
        }
        return inputs[name] || ''
      })

      const result = createAppResourceFromInputs()

      expect(result.env).toEqual({})
      expect(mockWarning).toHaveBeenCalledWith(
        'Failed to parse input as JSON: env. Using empty object instead.'
      )
    })

    it('handles non-object input with warning', () => {
      mockGetInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          env: '"not an object"'
        }
        return inputs[name] || ''
      })

      const result = createAppResourceFromInputs()

      expect(result.env).toEqual({})
      expect(mockWarning).toHaveBeenCalledWith(
        'Input "env" is not a valid JSON dictionary object.'
      )
    })

    it('handles array input with warning', () => {
      mockGetInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          rsp_headers: JSON.stringify(['not', 'an', 'object'])
        }
        return inputs[name] || ''
      })

      const result = createAppResourceFromInputs()

      expect(result.rsp_headers).toEqual({})
      expect(mockWarning).toHaveBeenCalledWith(
        'Input "rsp_headers" is not a valid JSON dictionary object.'
      )
    })

    it('handles null input with warning', () => {
      mockGetInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          env: 'null'
        }
        return inputs[name] || ''
      })

      const result = createAppResourceFromInputs()

      expect(result.env).toEqual({})
      expect(mockWarning).toHaveBeenCalledWith(
        'Input "env" is not a valid JSON dictionary object.'
      )
    })

    it('handles empty input by using default empty object', () => {
      mockGetInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          env: ''
        }
        return inputs[name] || ''
      })

      const result = createAppResourceFromInputs()

      expect(result.env).toEqual({})
    })

    it('handles mixed valid and invalid values correctly', () => {
      mockGetInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          env: JSON.stringify({
            VALID_STRING: 'correct',
            INVALID_NUMBER: 123,
            ANOTHER_VALID: 'also correct',
            INVALID_OBJECT: { nested: 'object' },
            INVALID_ARRAY: [1, 2, 3]
          })
        }
        return inputs[name] || ''
      })

      const result = createAppResourceFromInputs()

      expect(result.env).toEqual({
        VALID_STRING: 'correct',
        INVALID_NUMBER: '',
        ANOTHER_VALID: 'also correct',
        INVALID_OBJECT: '',
        INVALID_ARRAY: ''
      })
      expect(mockWarning).toHaveBeenCalledWith(
        'Value for key "INVALID_NUMBER" in input "env" is not a string.'
      )
      expect(mockWarning).toHaveBeenCalledWith(
        'Value for key "INVALID_OBJECT" in input "env" is not a string.'
      )
      expect(mockWarning).toHaveBeenCalledWith(
        'Value for key "INVALID_ARRAY" in input "env" is not a string.'
      )
    })
  })

  describe('parseSecretsInput', () => {
    it('parses valid secrets input correctly', () => {
      mockGetInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          secrets: JSON.stringify({
            database_password: { id: 123 },
            api_key: { id: 456 },
            encryption_key: { id: 789 }
          })
        }
        return inputs[name] || ''
      })

      const result = createAppResourceFromInputs()

      expect(result.secrets).toEqual({
        database_password: { id: 123 },
        api_key: { id: 456 },
        encryption_key: { id: 789 }
      })
    })

    it('handles invalid secret entries with warning and returns empty object', () => {
      mockGetInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          secrets: JSON.stringify({
            valid_secret: { id: 123 },
            invalid_secret: { id: 'not-a-number' },
            missing_id: { name: 'missing-id' }
          })
        }
        return inputs[name] || ''
      })

      const result = createAppResourceFromInputs()

      expect(result.secrets).toEqual({})
      expect(mockWarning).toHaveBeenCalledWith(
        "Failed to validate secrets input. Each secret must be an object with 'id' property set as a number."
      )
    })

    it('handles invalid JSON with warning and returns empty object', () => {
      mockGetInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          secrets: '{invalid json}'
        }
        return inputs[name] || ''
      })

      const result = createAppResourceFromInputs()

      expect(result.secrets).toEqual({})
      expect(mockWarning).toHaveBeenCalledWith(
        'Failed to parse input as JSON: secrets. Using empty object instead.'
      )
    })

    it('handles non-object input with warning', () => {
      mockGetInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          secrets: '"not an object"'
        }
        return inputs[name] || ''
      })

      const result = createAppResourceFromInputs()

      expect(result.secrets).toEqual({})
      expect(mockWarning).toHaveBeenCalledWith(
        'Input "secrets" is not a valid JSON secrets object.'
      )
    })

    it('handles array input with warning', () => {
      mockGetInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          secrets: JSON.stringify([{ id: 123 }, { id: 456 }])
        }
        return inputs[name] || ''
      })

      const result = createAppResourceFromInputs()

      expect(result.secrets).toEqual({})
      expect(mockWarning).toHaveBeenCalledWith(
        'Input "secrets" is not a valid JSON secrets object.'
      )
    })

    it('handles null input with warning', () => {
      mockGetInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          secrets: 'null'
        }
        return inputs[name] || ''
      })

      const result = createAppResourceFromInputs()

      expect(result.secrets).toEqual({})
      expect(mockWarning).toHaveBeenCalledWith(
        'Input "secrets" is not a valid JSON secrets object.'
      )
    })

    it('handles empty input by using default empty object', () => {
      mockGetInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          secrets: ''
        }
        return inputs[name] || ''
      })

      const result = createAppResourceFromInputs()

      expect(result.secrets).toEqual({})
    })

    it('handles secrets with non-object values', () => {
      mockGetInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          secrets: JSON.stringify({
            valid_secret: { id: 123 },
            invalid_secret: 'not an object',
            null_secret: null
          })
        }
        return inputs[name] || ''
      })

      const result = createAppResourceFromInputs()

      expect(result.secrets).toEqual({})
      expect(mockWarning).toHaveBeenCalledWith(
        "Failed to validate secrets input. Each secret must be an object with 'id' property set as a number."
      )
    })

    it('handles secrets with missing id property', () => {
      mockGetInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          secrets: JSON.stringify({
            valid_secret: { id: 123 },
            missing_id: { name: 'secret-without-id' },
            empty_object: {}
          })
        }
        return inputs[name] || ''
      })

      const result = createAppResourceFromInputs()

      expect(result.secrets).toEqual({})
      expect(mockWarning).toHaveBeenCalledWith(
        "Failed to validate secrets input. Each secret must be an object with 'id' property set as a number."
      )
    })

    it('handles secrets with non-numeric id values', () => {
      mockGetInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          secrets: JSON.stringify({
            valid_secret: { id: 123 },
            string_id: { id: '456' },
            boolean_id: { id: true },
            object_id: { id: { nested: 'value' } }
          })
        }
        return inputs[name] || ''
      })

      const result = createAppResourceFromInputs()

      expect(result.secrets).toEqual({})
      expect(mockWarning).toHaveBeenCalledWith(
        "Failed to validate secrets input. Each secret must be an object with 'id' property set as a number."
      )
    })

    it('validates all secrets must have numeric id properties', () => {
      mockGetInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          secrets: JSON.stringify({
            secret1: { id: 123 },
            secret2: { id: 456 },
            secret3: { id: 0 }, // Zero is a valid number
            secret4: { id: -1 } // Negative numbers are valid
          })
        }
        return inputs[name] || ''
      })

      const result = createAppResourceFromInputs()

      expect(result.secrets).toEqual({
        secret1: { id: 123 },
        secret2: { id: 456 },
        secret3: { id: 0 },
        secret4: { id: -1 }
      })
    })
  })
})
