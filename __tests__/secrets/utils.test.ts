import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { GetSecretResponse, SecretResource } from '../../src/api-utils/types.js'

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
const { createSecretResourceFromInputs, filterSecretSlots } = await import(
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

  describe('filterSecretSlots', () => {
    it('adds missing slots for deletion when new resource has fewer slots', () => {
      const secretResource: SecretResource = {
        name: 'test-secret',
        comment: 'Test secret',
        secret_slots: [
          { slot: 0, value: 'new-value-0' },
          { slot: 2, value: 'new-value-2' }
        ]
      }

      const existingSecret: GetSecretResponse = {
        id: 123,
        name: 'test-secret',
        comment: 'Test secret',
        app_count: 2,
        secret_slots: [
          { slot: 0, value: 'old-value-0' },
          { slot: 1, value: 'old-value-1' },
          { slot: 2, value: 'old-value-2' },
          { slot: 3, value: 'old-value-3' }
        ]
      }

      const result = filterSecretSlots(secretResource, existingSecret)

      expect(result).toEqual({
        name: 'test-secret',
        comment: 'Test secret',
        secret_slots: [
          { slot: 0, value: 'new-value-0' },
          { slot: 2, value: 'new-value-2' },
          { slot: 1 }, // Marked for deletion
          { slot: 3 } // Marked for deletion
        ]
      })
    })

    it('returns unchanged resource when all existing slots are preserved', () => {
      const secretResource: SecretResource = {
        name: 'complete-secret',
        comment: 'All slots preserved',
        secret_slots: [
          { slot: 0, value: 'updated-value-0' },
          { slot: 1, value: 'updated-value-1' },
          { slot: 2, value: 'updated-value-2' }
        ]
      }

      const existingSecret: GetSecretResponse = {
        id: 456,
        name: 'complete-secret',
        comment: 'Test secret',
        app_count: 2,
        secret_slots: [
          { slot: 0, value: 'old-value-0' },
          { slot: 1, value: 'old-value-1' },
          { slot: 2, value: 'old-value-2' }
        ]
      }

      const result = filterSecretSlots(secretResource, existingSecret)

      expect(result).toEqual({
        name: 'complete-secret',
        comment: 'All slots preserved',
        secret_slots: [
          { slot: 0, value: 'updated-value-0' },
          { slot: 1, value: 'updated-value-1' },
          { slot: 2, value: 'updated-value-2' }
        ]
      })
    })

    it('handles new resource with additional slots', () => {
      const secretResource: SecretResource = {
        name: 'expanded-secret',
        comment: 'Adding new slots',
        secret_slots: [
          { slot: 0, value: 'value-0' },
          { slot: 1, value: 'value-1' },
          { slot: 2, value: 'value-2' },
          { slot: 5, value: 'value-5' } // New slot
        ]
      }

      const existingSecret: GetSecretResponse = {
        id: 789,
        name: 'expanded-secret',
        comment: 'Test secret',
        app_count: 2,
        secret_slots: [
          { slot: 0, value: 'old-value-0' },
          { slot: 1, value: 'old-value-1' }
        ]
      }

      const result = filterSecretSlots(secretResource, existingSecret)

      expect(result).toEqual({
        name: 'expanded-secret',
        comment: 'Adding new slots',
        secret_slots: [
          { slot: 0, value: 'value-0' },
          { slot: 1, value: 'value-1' },
          { slot: 2, value: 'value-2' },
          { slot: 5, value: 'value-5' }
        ]
      })
    })

    it('handles empty existing secret slots', () => {
      const secretResource: SecretResource = {
        name: 'new-secret',
        comment: 'First time with slots',
        secret_slots: [{ slot: 0, value: 'first-value' }]
      }

      const existingSecret: GetSecretResponse = {
        id: 111,
        name: 'new-secret',
        comment: 'Test secret',
        app_count: 2,
        secret_slots: []
      }

      const result = filterSecretSlots(secretResource, existingSecret)

      expect(result).toEqual({
        name: 'new-secret',
        comment: 'First time with slots',
        secret_slots: [{ slot: 0, value: 'first-value' }]
      })
    })

    it('handles empty new resource slots with existing slots', () => {
      const secretResource: SecretResource = {
        name: 'clearing-secret',
        comment: 'Removing all slots',
        secret_slots: []
      }

      const existingSecret: GetSecretResponse = {
        id: 222,
        name: 'clearing-secret',
        comment: 'Test secret',
        app_count: 2,
        secret_slots: [
          { slot: 0, value: 'to-be-deleted' },
          { slot: 1, value: 'also-to-be-deleted' },
          { slot: 3, value: 'this-too' }
        ]
      }

      const result = filterSecretSlots(secretResource, existingSecret)

      expect(result).toEqual({
        name: 'clearing-secret',
        comment: 'Removing all slots',
        secret_slots: [
          { slot: 0 }, // Marked for deletion
          { slot: 1 }, // Marked for deletion
          { slot: 3 } // Marked for deletion
        ]
      })
    })

    it('handles mixed scenario with some slots updated, some deleted, some added', () => {
      const secretResource: SecretResource = {
        name: 'complex-secret',
        comment: 'Complex update scenario',
        secret_slots: [
          { slot: 0, value: 'updated-value-0' }, // Updated
          { slot: 2, value: 'new-value-2' }, // New
          { slot: 4, value: 'updated-value-4' } // Updated
          // slot 1 and 3 will be deleted
        ]
      }

      const existingSecret: GetSecretResponse = {
        id: 333,
        name: 'complex-secret',
        comment: 'Test secret',
        app_count: 2,
        secret_slots: [
          { slot: 0, value: 'old-value-0' },
          { slot: 1, value: 'to-be-deleted' },
          { slot: 3, value: 'also-to-be-deleted' },
          { slot: 4, value: 'old-value-4' }
        ]
      }

      const result = filterSecretSlots(secretResource, existingSecret)

      expect(result).toEqual({
        name: 'complex-secret',
        comment: 'Complex update scenario',
        secret_slots: [
          { slot: 0, value: 'updated-value-0' },
          { slot: 2, value: 'new-value-2' },
          { slot: 4, value: 'updated-value-4' },
          { slot: 1 }, // Marked for deletion
          { slot: 3 } // Marked for deletion
        ]
      })
    })

    it('handles non-sequential slot numbers correctly', () => {
      const secretResource: SecretResource = {
        name: 'sparse-secret',
        comment: 'Non-sequential slots',
        secret_slots: [
          { slot: 10, value: 'value-10' },
          { slot: 50, value: 'value-50' }
        ]
      }

      const existingSecret: GetSecretResponse = {
        id: 444,
        name: 'sparse-secret',
        comment: 'Test secret',
        app_count: 2,
        secret_slots: [
          { slot: 5, value: 'old-value-5' },
          { slot: 10, value: 'old-value-10' },
          { slot: 25, value: 'old-value-25' },
          { slot: 100, value: 'old-value-100' }
        ]
      }

      const result = filterSecretSlots(secretResource, existingSecret)

      expect(result).toEqual({
        name: 'sparse-secret',
        comment: 'Non-sequential slots',
        secret_slots: [
          { slot: 10, value: 'value-10' },
          { slot: 50, value: 'value-50' },
          { slot: 5 }, // Marked for deletion
          { slot: 25 }, // Marked for deletion
          { slot: 100 } // Marked for deletion
        ]
      })
    })

    it('preserves other resource properties unchanged', () => {
      const secretResource: SecretResource = {
        name: 'property-test-secret',
        comment: 'Testing property preservation',
        secret_slots: [{ slot: 0, value: 'test-value' }]
      }

      const existingSecret: GetSecretResponse = {
        id: 555,
        name: 'property-test-secret',
        comment: 'Test secret',
        app_count: 2,
        secret_slots: [
          { slot: 0, value: 'old-value' },
          { slot: 1, value: 'to-delete' }
        ]
      }

      const result = filterSecretSlots(secretResource, existingSecret)

      // Verify that name and comment are preserved exactly
      expect(result.name).toBe(secretResource.name)
      expect(result.comment).toBe(secretResource.comment)
      expect(result.secret_slots).toHaveLength(2)
      expect(result.secret_slots[0]).toEqual({ slot: 0, value: 'test-value' })
      expect(result.secret_slots[1]).toEqual({ slot: 1 })
    })
  })
})
