import * as core from '@actions/core'

import type { SecretResource, SecretSlots } from '../api-utils/types.js'

/**
 * Type guard to validate if an object is a valid SecretSlots
 */
function isValidSecretSlot(slot: SecretSlots): slot is SecretSlots {
  return (
    typeof slot === 'object' &&
    slot !== null &&
    typeof slot.slot === 'number' &&
    typeof slot.value === 'string' &&
    slot.value.trim() !== ''
  )
}

function parseSecretSlots(secretSlotsInput = '[]'): Array<SecretSlots> {
  try {
    const secretSlots = JSON.parse(secretSlotsInput.trim())
    if (!Array.isArray(secretSlots)) {
      core.warning(`Failed to parse secret_slots as valid JSON array.`)
      return []
    }
    const isValid = secretSlots.every(isValidSecretSlot)
    if (!isValid) {
      core.warning(
        `Failed to validate secret_slots. Each slot must be an object with 'slot' and 'value' properties.`
      )
      return []
    }
    return secretSlots
  } catch {
    core.warning(`Failed to parse secret_slots as JSON`)
    return []
  }
}

function createSecretSlots(): Array<SecretSlots> {
  let secretSlots = parseSecretSlots(core.getInput('secret_slots'))
  if (secretSlots.length === 0) {
    const secretValue = core.getInput('secret') || ''
    if (secretValue.trim() !== '') {
      secretSlots = [
        {
          slot: 0,
          value: secretValue
        }
      ]
    }
  }
  if (secretSlots.length === 0) {
    core.warning('No secret_slots provided.')
  }
  return secretSlots
}

/**
 * Creates a secret resource from the action inputs.
 */

function createSecretResourceFromInputs(): SecretResource {
  const secretSlots = createSecretSlots()
  return {
    name: core.getInput('secret_name'),
    comment: core.getInput('comment') || '',
    secret_slots: secretSlots
  }
}

export { createSecretResourceFromInputs }
