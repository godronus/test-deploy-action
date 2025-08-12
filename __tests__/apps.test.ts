import { describe, it, expect, beforeEach, jest } from '@jest/globals'

import { createMockResponse } from '../__fixtures__/mockResponse.js'
import {
  appendAppIncludes,
  createApp,
  getApp,
  getAppByName,
  getApps,
  updateApp
} from '../src/api-utils/apps/index.js'

import type {
  ApiType,
  CreateAppFromBinaryResource,
  CreateAppFromTemplateResource,
  CreateAppResponse,
  GetAppResponse,
  GetAppsResponse,
  GetAppsResponseItem,
  GetBinaryResponse,
  UpdateAppResource
} from '../src/api-utils/types.js'

const mockApiUrl = 'https://api.example.com'
const mockApiKey = 'test-api-key'
const mockApiConfig = {
  apiUrl: mockApiUrl,
  apiKey: mockApiKey
}

describe('Application functions', () => {
  describe('getApp', () => {
    beforeEach(() => {
      jest.resetAllMocks()
    })

    it('fetches a singular application and returns response', async () => {
      const mockAppObj: GetAppResponse = {
        id: 56891,
        api_type: 'wasi-http' as ApiType,
        binary: 12345,
        env: {},
        log: 'kafka',
        name: 'gnome-maze',
        networks: ['default'],
        plan: 'basic',
        plan_id: 1,
        rsp_headers: {},
        secrets: {},
        status: 1,
        url: 'https://gnome-maze.preprod-world.org'
      }
      jest
        .spyOn(globalThis, 'fetch')
        .mockImplementation((): Promise<Response> => {
          return Promise.resolve(
            createMockResponse<GetAppResponse>({
              ok: true,
              data: mockAppObj
            })
          )
        })

      const result = await getApp(mockApiConfig, 589)
      expect(result).toEqual(mockAppObj)
      expect(globalThis.fetch).toHaveBeenCalledWith(
        `${mockApiUrl}/fastedge/v1/apps/589`,
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: `APIKey ${mockApiKey}`
          })
        })
      )
    })

    it('throws error if response is not ok', async () => {
      jest
        .spyOn(globalThis, 'fetch')
        .mockImplementation((): Promise<Response> => {
          return Promise.resolve(
            createMockResponse({
              ok: false
            })
          )
        })

      await expect(getApp(mockApiConfig, 556)).rejects.toThrow(
        'Error fetching application: Bad Request'
      )
    })

    it('throws error if fetch throws', async () => {
      jest
        .spyOn(globalThis, 'fetch')
        .mockRejectedValue(new Error('Network error'))

      await expect(getApp(mockApiConfig, 564)).rejects.toThrow(
        'Error fetching application: Network error'
      )
    })
  })

  describe('getAppByName', () => {
    beforeEach(() => {
      jest.resetAllMocks()
    })

    it('fetches a singular application by name and returns response', async () => {
      const mockAppObj: GetAppsResponseItem = {
        id: 56891,
        api_type: 'wasi-http' as ApiType,
        binary: 12345,
        name: 'gnome-maze',
        comment: 'Test app',
        networks: ['default'],
        plan: 'basic',
        plan_id: 1,
        status: 1,
        url: 'https://gnome-maze.preprod-world.org'
      }
      jest
        .spyOn(globalThis, 'fetch')
        .mockImplementation((): Promise<Response> => {
          return Promise.resolve(
            createMockResponse({
              ok: true,
              data: { apps: [mockAppObj] }
            })
          )
        })

      const result = await getAppByName(mockApiConfig, 'gnome-maze')
      expect(result).toEqual(mockAppObj)
      expect(globalThis.fetch).toHaveBeenCalledWith(
        `${mockApiUrl}/fastedge/v1/apps?name=gnome-maze`,
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: `APIKey ${mockApiKey}`
          })
        })
      )
    })

    it('throws an error if it cannot find an application matching the name', async () => {
      jest
        .spyOn(globalThis, 'fetch')
        .mockImplementation((): Promise<Response> => {
          return Promise.resolve(
            createMockResponse({
              ok: true,
              data: { apps: [] }
            })
          )
        })

      const name = 'non-existent-app'
      await expect(getAppByName(mockApiConfig, name)).rejects.toThrow(
        `Application with name "${name}" not found`
      )
    })

    it('throws error if response is not ok', async () => {
      jest
        .spyOn(globalThis, 'fetch')
        .mockImplementation((): Promise<Response> => {
          return Promise.resolve(
            createMockResponse({
              ok: false
            })
          )
        })

      await expect(
        getAppByName(mockApiConfig, 'non-existent-app')
      ).rejects.toThrow('Error fetching applications: Bad Request')
    })

    it('throws error if fetch throws', async () => {
      jest
        .spyOn(globalThis, 'fetch')
        .mockRejectedValue(new Error('Network error'))

      await expect(getAppByName(mockApiConfig, 'gnome-maze')).rejects.toThrow(
        'Error fetching applications: Network error'
      )
    })
  })

  describe('appendAppIncludes', () => {
    const mockAppWithBinary: GetAppResponse = {
      id: 56891,
      api_type: 'wasi-http' as ApiType,
      binary: 12345,
      env: {},
      log: 'kafka',
      name: 'gnome-maze',
      networks: ['default'],
      plan: 'basic',
      plan_id: 1,
      rsp_headers: {},
      secrets: {},
      status: 1,
      url: 'https://gnome-maze.preprod-world.org'
    }

    const mockAppWithoutBinary: GetAppResponse = {
      id: 56892,
      api_type: 'wasi-http' as ApiType,
      // @ts-expect-error - binary is NOT optional
      binary: undefined,
      env: {},
      log: 'kafka',
      name: 'gnome-chess',
      networks: ['default'],
      plan: 'basic',
      plan_id: 1,
      rsp_headers: {},
      secrets: {},
      status: 1,
      url: 'https://gnome-chess.preprod-world.org'
    }

    const mockBinaryResponse: GetBinaryResponse = {
      id: 12345,
      api_type: 'wasi-http' as ApiType,
      checksum: 'abc123def456',
      source: 1,
      status: 1
    }

    beforeEach(() => {
      jest.resetAllMocks()
    })

    it('returns enhanced app response without chaining', async () => {
      const mockGetAppFn = jest
        .fn<() => Promise<GetAppResponse>>()
        .mockResolvedValue(mockAppWithBinary)

      const result = await appendAppIncludes(mockApiConfig, mockGetAppFn)

      expect(result).toEqual(mockAppWithBinary)
      expect(mockGetAppFn).toHaveBeenCalledTimes(1)
    })

    it('includes binary data when includeBinary is chained', async () => {
      const mockGetAppFn = jest
        .fn<() => Promise<GetAppResponse>>()
        .mockResolvedValue(mockAppWithBinary)

      jest
        .spyOn(globalThis, 'fetch')
        .mockImplementation((): Promise<Response> => {
          return Promise.resolve(
            createMockResponse<GetBinaryResponse>({
              ok: true,
              data: mockBinaryResponse
            })
          )
        })

      const result = await appendAppIncludes(
        mockApiConfig,
        mockGetAppFn
      ).includeBinary()

      expect(result).toEqual({
        ...mockAppWithBinary,
        binary: mockBinaryResponse
      })
      expect(mockGetAppFn).toHaveBeenCalledTimes(1)
      expect(globalThis.fetch).toHaveBeenCalledWith(
        `${mockApiUrl}/fastedge/v1/binaries/12345`,
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: `APIKey ${mockApiKey}`
          })
        })
      )
    })

    it('handles app without binary when includeBinary is chained', async () => {
      const mockGetAppFn = jest
        .fn<() => Promise<GetAppResponse>>()
        .mockResolvedValue(mockAppWithoutBinary)

      const result = await appendAppIncludes(
        mockApiConfig,
        mockGetAppFn
      ).includeBinary()

      expect(result).toEqual(mockAppWithoutBinary)
      expect(mockGetAppFn).toHaveBeenCalledTimes(1)
      expect(globalThis.fetch).not.toHaveBeenCalled()
    })

    it('supports multiple chaining of includeBinary', async () => {
      const mockGetAppFn = jest
        .fn<() => Promise<GetAppResponse>>()
        .mockResolvedValue(mockAppWithBinary)

      jest
        .spyOn(globalThis, 'fetch')
        .mockImplementation((): Promise<Response> => {
          return Promise.resolve(
            createMockResponse<GetBinaryResponse>({
              ok: true,
              data: mockBinaryResponse
            })
          )
        })

      const result = await appendAppIncludes(mockApiConfig, mockGetAppFn)
        .includeBinary()
        .includeBinary()
        .includeBinary()

      expect(result).toEqual({
        ...mockAppWithBinary,
        binary: mockBinaryResponse
      })
      expect(mockGetAppFn).toHaveBeenCalledTimes(1)
      // Should only fetch binary once due to caching
      expect(globalThis.fetch).toHaveBeenCalledTimes(1)
    })

    it('throws error when binary fetch fails with includeBinary', async () => {
      const mockGetAppFn = jest
        .fn<() => Promise<GetAppResponse>>()
        .mockResolvedValue(mockAppWithBinary)

      jest
        .spyOn(globalThis, 'fetch')
        .mockImplementation((): Promise<Response> => {
          return Promise.resolve(
            createMockResponse({
              ok: false
            })
          )
        })

      await expect(
        appendAppIncludes(mockApiConfig, mockGetAppFn).includeBinary()
      ).rejects.toThrow('Error fetching binary: Bad Request')
    })

    it('handles network errors gracefully', async () => {
      const mockGetAppFn = jest
        .fn<() => Promise<GetAppResponse>>()
        .mockRejectedValue(new Error('Network error'))

      await expect(
        appendAppIncludes(mockApiConfig, mockGetAppFn)
      ).rejects.toThrow('Network error')
    })

    it('works with getApp function wrapper', async () => {
      jest
        .spyOn(globalThis, 'fetch')
        .mockImplementation((): Promise<Response> => {
          return Promise.resolve(
            createMockResponse<GetAppResponse>({
              ok: true,
              data: mockAppWithBinary
            })
          )
        })

      const result = await appendAppIncludes(mockApiConfig, () =>
        getApp(mockApiConfig, 56891)
      )

      expect(result).toEqual(mockAppWithBinary)
      expect(globalThis.fetch).toHaveBeenCalledWith(
        `${mockApiUrl}/fastedge/v1/apps/56891`,
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: `APIKey ${mockApiKey}`
          })
        })
      )
    })

    it('works with getAppByName function wrapper', async () => {
      jest
        .spyOn(globalThis, 'fetch')
        .mockImplementation((): Promise<Response> => {
          return Promise.resolve(
            createMockResponse({
              ok: true,
              data: { apps: [mockAppWithBinary] }
            })
          )
        })

      const result = await appendAppIncludes(mockApiConfig, () =>
        getAppByName(mockApiConfig, 'gnome-maze')
      )

      expect(result).toEqual(mockAppWithBinary)
      expect(globalThis.fetch).toHaveBeenCalledWith(
        `${mockApiUrl}/fastedge/v1/apps?name=gnome-maze`,
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: `APIKey ${mockApiKey}`
          })
        })
      )
    })
  })

  describe('getApps', () => {
    beforeEach(() => {
      jest.resetAllMocks()
    })

    it('fetches a list of applications and returns response', async () => {
      const mockAppsObj: GetAppsResponse = [
        {
          id: 56891,
          api_type: 'wasi-http' as ApiType,
          binary: 12345,
          name: 'gnome-maze',
          comment: 'Test app',
          networks: ['default'],
          plan: 'basic',
          plan_id: 1,
          status: 1,
          url: 'https://gnome-maze.preprod-world.org'
        },
        {
          id: 561,
          api_type: 'wasi-http' as ApiType,
          binary: 45,
          name: 'strange-love',
          comment: 'Test app 2',
          networks: ['default'],
          plan: 'basic',
          plan_id: 1,
          status: 1,
          url: 'https://strange-love.preprod-world.org'
        }
      ]
      jest
        .spyOn(globalThis, 'fetch')
        .mockImplementation((): Promise<Response> => {
          return Promise.resolve(
            createMockResponse({
              ok: true,
              data: { apps: mockAppsObj }
            })
          )
        })

      const result = await getApps(mockApiConfig, {})
      expect(result).toEqual(mockAppsObj)
      expect(globalThis.fetch).toHaveBeenCalledWith(
        `${mockApiUrl}/fastedge/v1/apps`,
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: `APIKey ${mockApiKey}`
          })
        })
      )
    })

    it('fetches a list of applications using the query params and returns response', async () => {
      const mockAppsObj: GetAppsResponse = [
        {
          id: 56891,
          api_type: 'wasi-http' as ApiType,
          binary: 12345,
          name: 'gnome-maze',
          comment: 'Test app',
          networks: ['default'],
          plan: 'basic',
          plan_id: 1,
          status: 1,
          url: 'https://gnome-maze.preprod-world.org'
        }
      ]
      jest
        .spyOn(globalThis, 'fetch')
        .mockImplementation((): Promise<Response> => {
          return Promise.resolve(
            createMockResponse({
              ok: true,
              data: { apps: mockAppsObj }
            })
          )
        })

      const result = await getApps(mockApiConfig, { name: 'gnome-maze' })
      expect(result).toEqual(mockAppsObj)
      expect(globalThis.fetch).toHaveBeenCalledWith(
        `${mockApiUrl}/fastedge/v1/apps?name=gnome-maze`,
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: `APIKey ${mockApiKey}`
          })
        })
      )
    })

    it('throws error if response is not ok', async () => {
      jest
        .spyOn(globalThis, 'fetch')
        .mockImplementation((): Promise<Response> => {
          return Promise.resolve(
            createMockResponse({
              ok: false
            })
          )
        })

      await expect(getApps(mockApiConfig, {})).rejects.toThrow(
        'Error fetching applications: Bad Request'
      )
    })

    it('throws error if fetch throws', async () => {
      jest
        .spyOn(globalThis, 'fetch')
        .mockRejectedValue(new Error('Network error'))

      await expect(getApps(mockApiConfig, {})).rejects.toThrow(
        'Error fetching applications: Network error'
      )
    })
  })

  describe('createApp', () => {
    const mockAppResource: CreateAppFromBinaryResource = {
      api_type: 'wasi-http' as ApiType,
      binary: 159487,
      status: 1,
      rsp_headers: {},
      env: {},
      secrets: {},
      comment: 'Test application'
    }

    beforeEach(() => {
      jest.resetAllMocks()
    })

    it('creates an application from a binary and returns response', async () => {
      const mockAppResponse: CreateAppResponse = {
        id: 789456,
        api_type: 'wasi-http' as ApiType,
        binary: 159487,
        status: 200,
        name: 'gnome-maze',
        plan: 'small_euro',
        plan_id: 2,
        url: 'https://gnome-maze.preprod-world.org'
      }

      jest
        .spyOn(globalThis, 'fetch')
        .mockImplementation((): Promise<Response> => {
          return Promise.resolve(
            createMockResponse({
              ok: true,
              data: mockAppResponse
            })
          )
        })

      const result = await createApp(mockApiConfig, mockAppResource)
      expect(result).toEqual(mockAppResponse)
      expect(globalThis.fetch).toHaveBeenCalledWith(
        `${mockApiUrl}/fastedge/v1/apps`,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: `APIKey ${mockApiKey}`
          }),
          body: JSON.stringify(mockAppResource)
        })
      )
    })

    it('creates an application from a template and returns response', async () => {
      const mockAppTemplateResource: CreateAppFromTemplateResource = {
        api_type: 'wasi-http' as ApiType,
        name: 'template-dwarf',
        template: 15,
        status: 1,
        rsp_headers: {},
        env: {},
        secrets: {},
        comment: 'Test Template application'
      }

      const mockAppResponse = {
        id: 789456,
        api_type: 'wasi-http' as ApiType,
        binary: 159487,
        status: 200,
        plan: 'small_euro',
        plan_id: 2,
        name: 'template-dwarf',
        url: 'https://template-dwarf.preprod-world.org'
      }

      jest
        .spyOn(globalThis, 'fetch')
        .mockImplementation((): Promise<Response> => {
          return Promise.resolve(
            createMockResponse<CreateAppResponse>({
              ok: true,
              data: mockAppResponse
            })
          )
        })

      const result = await createApp(mockApiConfig, mockAppTemplateResource)
      expect(result).toEqual(mockAppResponse)
      expect(globalThis.fetch).toHaveBeenCalledWith(
        `${mockApiUrl}/fastedge/v1/apps`,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: `APIKey ${mockApiKey}`
          }),
          body: JSON.stringify(mockAppTemplateResource)
        })
      )
    })

    it('throws error if response is not ok', async () => {
      jest
        .spyOn(globalThis, 'fetch')
        .mockImplementation((): Promise<Response> => {
          return Promise.resolve(
            createMockResponse({
              ok: false
            })
          )
        })

      await expect(createApp(mockApiConfig, mockAppResource)).rejects.toThrow(
        'Error creating application: Bad Request'
      )
    })

    it('throws error if fetch throws', async () => {
      jest
        .spyOn(globalThis, 'fetch')
        .mockRejectedValue(new Error('Network error'))

      await expect(createApp(mockApiConfig, mockAppResource)).rejects.toThrow(
        'Error creating application: Network error'
      )
    })
  })

  describe('updateApp', () => {
    const mockAppResource: UpdateAppResource = {
      id: 123456,
      api_type: 'wasi-http' as ApiType,
      binary: 159487,
      name: 'snake-hips',
      status: 1,
      rsp_headers: {},
      env: {},
      secrets: {},
      comment: 'Test application',
      url: 'https://snake-hips.preprod-world.org'
    }

    beforeEach(() => {
      jest.resetAllMocks()
    })

    it('update an application and returns response', async () => {
      const mockAppResponse: CreateAppResponse = {
        id: 123456,
        api_type: 'wasi-http' as ApiType,
        binary: 159487,
        status: 200,
        name: 'snake-hips',
        plan: 'small_euro',
        plan_id: 2,
        url: 'https://snake-hips.preprod-world.org'
      }

      jest
        .spyOn(globalThis, 'fetch')
        .mockImplementation((): Promise<Response> => {
          return Promise.resolve(
            createMockResponse({
              ok: true,
              data: mockAppResponse
            })
          )
        })

      const result = await updateApp(mockApiConfig, mockAppResource)
      expect(result).toEqual(mockAppResponse)
      expect(globalThis.fetch).toHaveBeenCalledWith(
        `${mockApiUrl}/fastedge/v1/apps/123456`,
        expect.objectContaining({
          method: 'PUT',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: `APIKey ${mockApiKey}`
          }),
          body: JSON.stringify(mockAppResource)
        })
      )
    })

    it('throws error if response is not ok', async () => {
      jest
        .spyOn(globalThis, 'fetch')
        .mockImplementation((): Promise<Response> => {
          return Promise.resolve(
            createMockResponse({
              ok: false
            })
          )
        })

      await expect(updateApp(mockApiConfig, mockAppResource)).rejects.toThrow(
        'Error updating application: Bad Request'
      )
    })

    it('throws error if fetch throws', async () => {
      jest
        .spyOn(globalThis, 'fetch')
        .mockRejectedValue(new Error('Network error'))

      await expect(updateApp(mockApiConfig, mockAppResource)).rejects.toThrow(
        'Error updating application: Network error'
      )
    })
  })
})
