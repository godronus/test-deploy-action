import { describe, it, expect, jest, beforeEach } from '@jest/globals'

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
const { createSecretResourceFromInputs } = await import(
  '../../src/secrets/utils.js'
)

describe('Secrets Utils functions', () => {
  beforeEach(() => {
    jest.resetAllMocks()
  })

  describe('createSecretResourceFromInputs', () => {
    it('creates secret resource with valid secret_slots input', () => {
      mockGetInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          secret_name: 'database-config',
          comment: 'Production database configuration',
          secret_slots: JSON.stringify([
            { slot: 0, value: 'primary-db-password' },
            { slot: 1, value: 'backup-db-password' }
          ]),
          secret: ''
        }
        return inputs[name] || ''
      })

      const result = createSecretResourceFromInputs()

      expect(result).toEqual({
        name: 'database-config',
        comment: 'Production database configuration',
        secret_slots: [
          { slot: 0, value: 'primary-db-password' },
          { slot: 1, value: 'backup-db-password' }
        ]
      })
    })

    it('creates secret resource with fallback to secret input when secret_slots is empty', () => {
      mockGetInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          secret_name: 'api-key',
          comment: 'External API key',
          secret_slots: '[]',
          secret: 'fallback-secret-value'
        }
        return inputs[name] || ''
      })

      const result = createSecretResourceFromInputs()

      expect(result).toEqual({
        name: 'api-key',
        comment: 'External API key',
        secret_slots: [{ slot: 0, value: 'fallback-secret-value' }]
      })
    })

    it('creates secret resource with minimal inputs', () => {
      mockGetInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          secret_name: 'minimal-secret',
          comment: '',
          secret_slots: JSON.stringify([{ slot: 0, value: 'simple-value' }]),
          secret: ''
        }
        return inputs[name] || ''
      })

      const result = createSecretResourceFromInputs()

      expect(result).toEqual({
        name: 'minimal-secret',
        comment: '',
        secret_slots: [{ slot: 0, value: 'simple-value' }]
      })
    })

    it('handles invalid JSON in secret_slots with warning', () => {
      mockGetInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          secret_name: 'invalid-json-secret',
          comment: 'Test with invalid JSON',
          secret_slots: '{invalid json}',
          secret: 'fallback-value'
        }
        return inputs[name] || ''
      })

      const result = createSecretResourceFromInputs()

      expect(result).toEqual({
        name: 'invalid-json-secret',
        comment: 'Test with invalid JSON',
        secret_slots: [{ slot: 0, value: 'fallback-value' }]
      })
      expect(mockWarning).toHaveBeenCalledWith(
        'Failed to parse secret_slots as JSON'
      )
    })

    it('handles non-array secret_slots input with warning', () => {
      mockGetInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          secret_name: 'non-array-secret',
          comment: 'Test with non-array JSON',
          secret_slots: '{"not": "an array"}',
          secret: 'fallback-value'
        }
        return inputs[name] || ''
      })

      const result = createSecretResourceFromInputs()

      expect(result).toEqual({
        name: 'non-array-secret',
        comment: 'Test with non-array JSON',
        secret_slots: [{ slot: 0, value: 'fallback-value' }]
      })
      expect(mockWarning).toHaveBeenCalledWith(
        'Failed to parse secret_slots as valid JSON array.'
      )
    })

    it('handles invalid secret slot objects with warning', () => {
      mockGetInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          secret_name: 'invalid-slots-secret',
          comment: 'Test with invalid slot objects',
          secret_slots: JSON.stringify([
            { slot: 0, value: 'valid-slot' },
            { slot: 'invalid', value: 'invalid-slot' }, // slot should be number
            { slot: 1, value: '' } // empty value
          ]),
          secret: 'fallback-value'
        }
        return inputs[name] || ''
      })

      const result = createSecretResourceFromInputs()

      expect(result).toEqual({
        name: 'invalid-slots-secret',
        comment: 'Test with invalid slot objects',
        secret_slots: [{ slot: 0, value: 'fallback-value' }]
      })
      expect(mockWarning).toHaveBeenCalledWith(
        "Failed to validate secret_slots. Each slot must be an object with 'slot' and 'value' properties."
      )
    })

    it('handles empty secret_slots and empty secret with warning', () => {
      mockGetInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          secret_name: 'empty-secret',
          comment: 'Test with no secrets',
          secret_slots: '[]',
          secret: ''
        }
        return inputs[name] || ''
      })

      const result = createSecretResourceFromInputs()

      expect(result).toEqual({
        name: 'empty-secret',
        comment: 'Test with no secrets',
        secret_slots: []
      })
      expect(mockWarning).toHaveBeenCalledWith('No secret_slots provided.')
    })

    it('handles whitespace-only secret input', () => {
      mockGetInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          secret_name: 'whitespace-secret',
          comment: 'Test with whitespace secret',
          secret_slots: '[]',
          secret: '   \t\n   '
        }
        return inputs[name] || ''
      })

      const result = createSecretResourceFromInputs()

      expect(result).toEqual({
        name: 'whitespace-secret',
        comment: 'Test with whitespace secret',
        secret_slots: []
      })
      expect(mockWarning).toHaveBeenCalledWith('No secret_slots provided.')
    })

    it('handles multiple valid slots', () => {
      mockGetInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          secret_name: 'multi-slot-secret',
          comment: 'Secret with multiple slots',
          secret_slots: JSON.stringify([
            { slot: 0, value: 'primary-secret' },
            { slot: 1, value: 'secondary-secret' },
            { slot: 5, value: 'tertiary-secret' }
          ]),
          secret: ''
        }
        return inputs[name] || ''
      })

      const result = createSecretResourceFromInputs()

      expect(result).toEqual({
        name: 'multi-slot-secret',
        comment: 'Secret with multiple slots',
        secret_slots: [
          { slot: 0, value: 'primary-secret' },
          { slot: 1, value: 'secondary-secret' },
          { slot: 5, value: 'tertiary-secret' }
        ]
      })
    })

    it('handles empty comment input', () => {
      mockGetInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          secret_name: 'no-comment-secret',
          comment: '',
          secret_slots: JSON.stringify([{ slot: 0, value: 'secret-value' }]),
          secret: ''
        }
        return inputs[name] || ''
      })

      const result = createSecretResourceFromInputs()

      expect(result).toEqual({
        name: 'no-comment-secret',
        comment: '',
        secret_slots: [{ slot: 0, value: 'secret-value' }]
      })
    })

    it('prioritizes secret_slots over secret input when both are provided', () => {
      mockGetInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          secret_name: 'priority-test-secret',
          comment: 'Testing priority',
          secret_slots: JSON.stringify([{ slot: 2, value: 'priority-secret' }]),
          secret: 'ignored-fallback-value'
        }
        return inputs[name] || ''
      })

      const result = createSecretResourceFromInputs()

      expect(result).toEqual({
        name: 'priority-test-secret',
        comment: 'Testing priority',
        secret_slots: [{ slot: 2, value: 'priority-secret' }]
      })
    })

    it('handles slots with special characters and unicode', () => {
      mockGetInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          secret_name: 'unicode-secret',
          comment: 'Secret with special characters',
          secret_slots: JSON.stringify([
            { slot: 0, value: 'password123!@#$%^&*()' },
            { slot: 1, value: 'üñîçødé-sécret' }
          ]),
          secret: ''
        }
        return inputs[name] || ''
      })

      const result = createSecretResourceFromInputs()

      expect(result).toEqual({
        name: 'unicode-secret',
        comment: 'Secret with special characters',
        secret_slots: [
          { slot: 0, value: 'password123!@#$%^&*()' },
          { slot: 1, value: 'üñîçødé-sécret' }
        ]
      })
    })

    it('handles mixed valid and invalid slots by falling back to secret input', () => {
      mockGetInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          secret_name: 'mixed-validity-secret',
          comment: 'Mixed valid and invalid slots',
          secret_slots: JSON.stringify([
            { slot: 0, value: 'valid-slot' },
            { slot: null, value: 'invalid-slot' }, // null slot
            { slot: 2, value: 'another-valid-slot' }
          ]),
          secret: 'fallback-secret'
        }
        return inputs[name] || ''
      })

      const result = createSecretResourceFromInputs()

      expect(result).toEqual({
        name: 'mixed-validity-secret',
        comment: 'Mixed valid and invalid slots',
        secret_slots: [{ slot: 0, value: 'fallback-secret' }]
      })
      expect(mockWarning).toHaveBeenCalledWith(
        "Failed to validate secret_slots. Each slot must be an object with 'slot' and 'value' properties."
      )
    })
  })
})
