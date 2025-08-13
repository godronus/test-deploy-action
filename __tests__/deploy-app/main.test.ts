import { describe, it, expect, jest, beforeEach } from '@jest/globals'

// Create mock functions before mocking modules
const mockGetInput = jest.fn<(name: string) => string>()
const mockSetOutput = jest.fn()
const mockSetFailed = jest.fn()
const mockNotice = jest.fn()
const mockDebug = jest.fn()
const mockInfo = jest.fn()

const mockCreateAppResourceFromInputs = jest.fn()
const mockHasWasmBinaryChanged = jest.fn()

const mockGetApps = jest.fn()
const mockGetApp = jest.fn()
const mockGetAppByName = jest.fn()
const mockCreateApp = jest.fn()
const mockUpdateApp = jest.fn()
const mockUploadBinary = jest.fn()
const mockGetBinary = jest.fn()

// Mock @actions/core module
jest.unstable_mockModule('@actions/core', () => ({
  getInput: mockGetInput,
  setOutput: mockSetOutput,
  setFailed: mockSetFailed,
  notice: mockNotice,
  debug: mockDebug,
  info: mockInfo,
  warning: jest.fn(),
  error: jest.fn()
}))

// Mock utils module
jest.unstable_mockModule('../../src/deploy-app/utils.js', () => ({
  createAppResourceFromInputs: mockCreateAppResourceFromInputs,
  hasWasmBinaryChanged: mockHasWasmBinaryChanged
}))

// Mock FastEdgeClient
jest.unstable_mockModule('../../src/api-utils/index.js', () => ({
  FastEdgeClient: jest.fn().mockImplementation(() => ({
    apps: {
      getAll: mockGetApps,
      get: mockGetApp,
      getByName: mockGetAppByName,
      create: mockCreateApp,
      update: mockUpdateApp
    },
    binaries: {
      upload: mockUploadBinary,
      get: mockGetBinary
    }
  }))
  // getApps: mockGetApps,
  // getApp: mockGetApp,
  // getAppByName: mockGetAppByName,
  // createApp: mockCreateApp,
  // updateApp: mockUpdateApp,
  // uploadBinary: mockUploadBinary,
  // getBinary: mockGetBinary
}))

// Import the main function after mocking
const { run } = await import('../../src/deploy-app/main.js')

describe('main.ts', () => {
  const mockApiKey = 'test-api-key'
  const mockApiUrl = 'https://api.example.com'
  const mockWasmFile = './test.wasm'
  const mockAppName = 'test-app'

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('run function', () => {
    describe('With provided app_id', () => {
      const mockAppId = '789'
      beforeEach(() => {
        mockGetInput.mockImplementation((name: string) => {
          const inputs: Record<string, string> = {
            api_key: mockApiKey,
            api_url: mockApiUrl,
            wasm_file: mockWasmFile,
            app_name: mockAppName,
            app_id: mockAppId
          }
          return inputs[name] || ''
        })
      })

      it('finds existing app by ID when app_id is provided', async () => {
        const mockApp = {
          id: 789,
          name: mockAppName,
          binary: { id: 123, checksum: 'abc123' }
        }
        const mockAppResource = { id: 789, name: mockAppName, binary: 123 }
        const mockUpdatedApp = { id: 789, name: mockAppName, binary: 123 }

        const mockGetAppChain = {
          includeBinary: jest.fn().mockImplementation(() => mockApp)
        }
        mockGetApp.mockReturnValue(mockGetAppChain)
        mockHasWasmBinaryChanged.mockReturnValue(false)
        mockCreateAppResourceFromInputs.mockReturnValue(mockAppResource)
        mockUpdateApp.mockImplementation(() => mockUpdatedApp)

        await run()

        expect(mockGetApp).toHaveBeenCalledWith(mockAppId)
        expect(mockGetAppChain.includeBinary).toHaveBeenCalled()
        expect(mockHasWasmBinaryChanged).toHaveBeenCalledWith(
          mockApp.binary.checksum
        )
        expect(mockUpdateApp).toHaveBeenCalledWith({
          ...mockAppResource,
          binary: mockApp.binary.id,
          id: mockApp.id
        })
      })

      it('handles error when app lookup fails', async () => {
        const mockError = new Error('App not found')

        mockGetApp.mockImplementation(() => {
          throw mockError
        })

        await run()

        expect(mockSetFailed).toHaveBeenCalledWith(mockError.message)
      })
    })

    describe('without a provided app_id', () => {
      beforeEach(() => {
        mockGetInput.mockImplementation((name: string) => {
          const inputs: Record<string, string> = {
            api_key: mockApiKey,
            api_url: mockApiUrl,
            wasm_file: mockWasmFile,
            app_name: mockAppName
          }
          return inputs[name] || ''
        })
      })
      it('creates new application when no existing app found', async () => {
        const mockBinary = { id: 123, checksum: 'abc123' }
        const mockAppResource = { name: mockAppName, binary: 123 }
        const mockCreatedApp = { id: 456, name: mockAppName, binary: 123 }

        mockGetAppByName.mockImplementation(() => [])
        mockUploadBinary.mockImplementation(() => mockBinary)
        mockCreateAppResourceFromInputs.mockImplementation(
          () => mockAppResource
        )
        mockCreateApp.mockImplementation(() => mockCreatedApp)

        await run()

        expect(mockGetAppByName).toHaveBeenCalledWith(mockAppName)
        expect(mockUploadBinary).toHaveBeenCalledWith(mockWasmFile)
        expect(mockCreateApp).toHaveBeenCalledWith({
          ...mockAppResource,
          binary: mockBinary.id
        })
        expect(mockNotice).toHaveBeenCalledWith(
          `Application created with ID: ${mockCreatedApp.id}`
        )
        expect(mockSetOutput).toHaveBeenCalledWith('app_id', mockCreatedApp.id)
        expect(mockSetOutput).toHaveBeenCalledWith(
          'binary_id',
          mockCreatedApp.binary
        )
      })
      it('finds existing app by name when app_name is provided and no app_id', async () => {
        const mockApp = {
          id: 789,
          name: mockAppName,
          binary: { id: 123, checksum: 'abc123' }
        }
        const mockAppResource = { name: mockAppName, binary: 123 }
        const mockUpdatedApp = { id: 789, name: mockAppName, binary: 123 }

        const mockGetAppByNameChain = {
          includeBinary: jest.fn().mockImplementation(() => mockApp)
        }
        mockGetAppByName.mockReturnValue(mockGetAppByNameChain)
        mockHasWasmBinaryChanged.mockReturnValue(false)
        mockCreateAppResourceFromInputs.mockReturnValue(mockAppResource)
        mockUpdateApp.mockImplementation(() => mockUpdatedApp)

        await run()

        expect(mockGetAppByName).toHaveBeenCalledWith(mockAppName)
        expect(mockGetAppByNameChain.includeBinary).toHaveBeenCalled()
        expect(mockHasWasmBinaryChanged).toHaveBeenCalledWith(
          mockApp.binary.checksum
        )
        expect(mockUpdateApp).toHaveBeenCalledWith({
          ...mockAppResource,
          binary: mockApp.binary.id,
          id: mockApp.id
        })
      })

      it('uploads new binary when binary has changed', async () => {
        const mockApp = {
          id: 789,
          name: mockAppName,
          binary: { id: 123, checksum: 'old-checksum' }
        }
        const mockNewBinary = { id: 456, checksum: 'new-checksum' }
        const mockAppResource = { name: mockAppName, binary: 456 }
        const mockUpdatedApp = { id: 789, name: mockAppName, binary: 456 }

        const mockGetAppByNameChain = {
          includeBinary: jest.fn().mockImplementation(() => mockApp)
        }
        mockGetAppByName.mockReturnValue(mockGetAppByNameChain)
        mockHasWasmBinaryChanged.mockReturnValue(true)
        mockUploadBinary.mockImplementation(() => mockNewBinary)
        mockCreateAppResourceFromInputs.mockReturnValue(mockAppResource)
        mockUpdateApp.mockImplementation(() => mockUpdatedApp)

        await run()

        expect(mockDebug).toHaveBeenCalledWith(
          'Binary has changed, uploading new binary...'
        )
        expect(mockUploadBinary).toHaveBeenCalledWith(mockWasmFile)
        expect(mockUpdateApp).toHaveBeenCalledWith({
          ...mockAppResource,
          binary: mockNewBinary.id,
          id: mockApp.id
        })
      })

      it('handles app without binary checksum by uploading new binary', async () => {
        const mockApp = {
          id: 789,
          name: mockAppName,
          binary: { id: 123 } // No checksum property
        }
        const mockNewBinary = { id: 456, checksum: 'new-checksum' }
        const mockAppResource = { name: mockAppName, binary: 456 }
        const mockUpdatedApp = { id: 789, name: mockAppName, binary: 456 }

        const mockGetAppByNameChain = {
          includeBinary: jest.fn().mockImplementation(() => mockApp)
        }
        mockGetAppByName.mockReturnValue(mockGetAppByNameChain)
        mockUploadBinary.mockImplementation(() => mockNewBinary)
        mockCreateAppResourceFromInputs.mockReturnValue(mockAppResource)
        mockUpdateApp.mockImplementation(() => mockUpdatedApp)

        await run()

        expect(mockDebug).toHaveBeenCalledWith(
          'Binary has changed, uploading new binary...'
        )
        expect(mockUploadBinary).toHaveBeenCalledWith(mockWasmFile)
      })
      it('handles error when binary upload fails', async () => {
        const mockError = new Error('Upload failed')

        mockGetAppByName.mockImplementation(() => [])
        mockUploadBinary.mockImplementation(() => {
          throw mockError
        })

        await run()

        expect(mockSetFailed).toHaveBeenCalledWith(mockError.message)
      })

      it('handles error when app creation fails', async () => {
        const mockBinary = { id: 123, checksum: 'abc123' }
        const mockAppResource = { name: mockAppName, binary: 123 }
        const mockError = new Error('Creation failed')

        mockGetAppByName.mockImplementation(() => [])
        mockUploadBinary.mockImplementation(() => mockBinary)
        mockCreateAppResourceFromInputs.mockReturnValue(mockAppResource)
        mockCreateApp.mockImplementation(() => {
          throw mockError
        })

        await run()

        expect(mockSetFailed).toHaveBeenCalledWith(mockError.message)
      })
      it('handles error when app update fails', async () => {
        const mockApp = {
          id: 789,
          name: mockAppName,
          binary: { id: 123, checksum: 'abc123' }
        }
        const mockAppResource = { name: mockAppName, binary: 123 }
        const mockError = new Error('Update failed')

        const mockGetAppByNameChain = {
          includeBinary: jest.fn().mockImplementation(() => mockApp)
        }
        mockGetAppByName.mockReturnValue(mockGetAppByNameChain)
        mockHasWasmBinaryChanged.mockReturnValue(false)
        mockCreateAppResourceFromInputs.mockReturnValue(mockAppResource)
        mockUpdateApp.mockImplementation(() => {
          throw mockError
        })

        await run()

        expect(mockSetFailed).toHaveBeenCalledWith(mockError.message)
      })
    })

    describe('Error handling', () => {
      it('handles missing API key input', async () => {
        mockGetInput.mockImplementation((name: string) => {
          const inputs: Record<string, string> = {
            api_key: '', // Empty API key
            api_url: mockApiUrl,
            wasm_file: mockWasmFile,
            app_name: mockAppName,
            app_id: '0'
          }
          return inputs[name] || ''
        })

        await run()

        expect(mockSetFailed).toHaveBeenCalledWith(
          expect.stringContaining(
            'Mandatory inputs are missing: api_key, api_url, wasm_file'
          )
        )
      })

      it('handles missing wasm_file input', async () => {
        mockGetInput.mockImplementation((name: string) => {
          const inputs: Record<string, string> = {
            api_key: mockApiKey,
            api_url: mockApiUrl,
            wasm_file: '', // Empty wasm file
            app_name: mockAppName,
            app_id: '0'
          }
          return inputs[name] || ''
        })

        await run()

        expect(mockSetFailed).toHaveBeenCalledWith(
          expect.stringContaining(
            'Mandatory inputs are missing: api_key, api_url, wasm_file'
          )
        )
      })
    })
  })
})
