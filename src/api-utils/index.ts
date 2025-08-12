/* istanbul ignore file */

import { ApiConfig } from './types.js'
import * as apps from './apps/index.js'
import * as binaries from './binaries/index.js'

/**
 * FastEdge API client providing access to all API endpoints
 */
export class FastEdgeClient {
  private readonly apiConfig: ApiConfig

  /**
   * Creates a new FastEdge API client
   * @param apiKey - API key for authentication
   * @param apiUrl - Base URL for the FastEdge API
   */
  constructor(apiKey: string, apiUrl: string) {
    this.apiConfig = { apiKey, apiUrl }
  }

  /**
   * Access application-related API endpoints
   */
  get apps() {
    return {
      /**
       * Get a list of applications
       * @param params - Query parameters for filtering and pagination
       */
      getAll: (params: Parameters<typeof apps.getApps>[1] = {}) =>
        apps.getApps(this.apiConfig, params),

      /**
       * Get a specific application by ID
       * @param id - Application ID
       */
      get: (id: number | string) =>
        apps.appendAppIncludes(this.apiConfig, () =>
          apps.getApp(this.apiConfig, id)
        ),

      /**
       * Get a specific application by Name
       * @param id - Application ID
       */
      getByName: (name: string) =>
        apps.appendAppIncludes(this.apiConfig, () =>
          apps.getAppByName(this.apiConfig, name)
        ),

      /**
       * Create a new application from a binary or template
       * @param resource - Application creation parameters
       */
      createApp: (resource: Parameters<typeof apps.createApp>[1]) =>
        apps.createApp(this.apiConfig, resource)

      // Add other app methods as needed
    }
  }

  /**
   * Access binary-related API endpoints
   */
  get binaries() {
    return {
      /**
       * Upload a binary file
       * @param wasmPath - Path to the WASM binary file
       */
      upload: (wasmPath: string) =>
        binaries.uploadBinary(this.apiConfig, wasmPath),

      /**
       * Get a specific binary by ID
       * @param id - Binary ID
       */
      get: (id: number | string) => binaries.getBinary(this.apiConfig, id)

      // Add other binary methods as needed
    }
  }

  // /**
  //  * Access secret-related API endpoints
  //  */
  // get secrets() {
  //   return {
  //     // Secret-related methods
  //   }
  // }
}

// Also export individual functions for flexibility
export * from './apps/index.js'
export * from './binaries/index.js'
export * from './types.js'
