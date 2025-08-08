import qs from 'qs'

import { getBinary } from '../binaries/index.js'

import type {
  ApiConfig,
  CreateAppFromBinaryResource,
  CreateAppFromTemplateResource,
  EnhancedAppResponse,
  GetAppResponse,
  GetAppResponseWithBinary,
  GetAppsQueryParams,
  GetAppsResponse,
  UpdateAppResource
} from '../types.js'

function getEnhancedApp(
  apiConfig: ApiConfig,
  id: string | number
): EnhancedAppResponse {
  // Add any enhancements or modifications to the app object here
  const getAppPromise = getApp(apiConfig, id)

  const createEnhancedResponse = <T>(
    basePromise: Promise<T>
  ): EnhancedAppResponse<T> => {
    return Object.assign(basePromise, {
      includeBinary: (): EnhancedAppResponse<
        GetAppResponseWithBinary | GetAppResponse
      > => {
        const binaryPromise = basePromise.then(async (app: any) => {
          if (app.binary && typeof app.binary === 'number') {
            const binaryData = await getBinary(apiConfig, app.binary)
            return { ...app, binary: binaryData }
          }
          return { ...app }
        })
        return createEnhancedResponse(binaryPromise)
      }

      //   includeTemplate: (): EnhancedAppResponse<GetAppResponseComplete> => {
      //     const templatePromise = basePromise.then(async (app: any) => {
      //       if (app.template) {
      //         const templateData = await templates.getTemplate(
      //           this.apiConfig,
      //           app.template
      //         )
      //         return { ...app, template: templateData }
      //       }
      //       return { ...app }
      //     })
      //     return createEnhancedResponse(templatePromise)
      //   }
    }) as EnhancedAppResponse<T>
  }

  return createEnhancedResponse(getAppPromise)
}

async function getApp(
  apiConfig: ApiConfig,
  id: string | number
): Promise<GetAppResponse> {
  try {
    const response = await fetch(`${apiConfig.apiUrl}/fastedge/v1/apps/${id}`, {
      method: 'GET',
      headers: {
        Authorization: `APIKey ${apiConfig.apiKey}`
      }
    })
    if (!response.ok) {
      throw new Error(response.statusText)
    }
    return response.json() as Promise<GetAppResponse>
  } catch (error) {
    throw new Error(
      `Error fetching application: ${error instanceof Error ? error.message : error}`
    )
  }
}

async function getApps(
  apiConfig: ApiConfig,
  query: GetAppsQueryParams
): Promise<GetAppsResponse> {
  try {
    const queryString = qs.stringify(query, {
      skipNulls: true,
      addQueryPrefix: true
    })

    const response = await fetch(
      `${apiConfig.apiUrl}/fastedge/v1/apps${queryString}`,
      {
        method: 'GET',
        headers: {
          Authorization: `APIKey ${apiConfig.apiKey}`
        }
      }
    )
    if (!response.ok) {
      throw new Error(response.statusText)
    }
    return response.json() as Promise<GetAppsResponse>
  } catch (error) {
    throw new Error(
      `Error fetching applications: ${error instanceof Error ? error.message : error}`
    )
  }
}

async function createApp(
  apiConfig: ApiConfig,
  app: CreateAppFromBinaryResource | CreateAppFromTemplateResource
): Promise<GetAppResponse> {
  try {
    const response = await fetch(`${apiConfig.apiUrl}/fastedge/v1/apps`, {
      method: 'POST',
      headers: {
        Authorization: `APIKey ${apiConfig.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(app)
    })
    if (!response.ok) {
      throw new Error(response.statusText)
    }
    return response.json() as Promise<GetAppResponse>
  } catch (error) {
    throw new Error(
      `Error creating application: ${error instanceof Error ? error.message : error}`
    )
  }
}

async function updateApp(
  apiConfig: ApiConfig,
  app: UpdateAppResource
): Promise<GetAppResponse> {
  try {
    const response = await fetch(
      `${apiConfig.apiUrl}/fastedge/v1/apps/${app.id}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `APIKey ${apiConfig.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(app)
      }
    )
    if (!response.ok) {
      throw new Error(response.statusText)
    }
    return response.json() as Promise<GetAppResponse>
  } catch (error) {
    throw new Error(
      `Error updating application: ${error instanceof Error ? error.message : error}`
    )
  }
}

export { createApp, getApp, getApps, getEnhancedApp, updateApp }
