import { ApiType } from '../api-utils/types.js'

interface BinaryResponse {
  id: number
  api_type: ApiType
  checksum: string
  status: number
}

export type { BinaryResponse }
