import {
  ApiType,
  AppSecrets,
  GetBinaryResponse,
  OrderingParams,
  PaginationParams
} from '../types.js'

/**
// * Apps Base Resource
**/

interface AppResource {
  id: number
  api_type: ApiType
  binary: number
  comment: string
  env: Record<string, string>
  log: string
  name: string
  networks: Array<string>
  plan: string
  plan_id: number
  rsp_headers: Record<string, string>
  secrets: AppSecrets
  status: number
  template: number
  template_name: string
  url: string
}

/**
// * Fetching Single App Types
**/

type GetAppResponse = Pick<
  AppResource,
  | 'id'
  | 'api_type'
  | 'binary'
  | 'env'
  | 'log'
  | 'name'
  | 'networks'
  | 'plan'
  | 'plan_id'
  | 'rsp_headers'
  | 'secrets'
  | 'status'
  | 'url'
> &
  Partial<Pick<AppResource, 'template' | 'template_name'>>

type GetAppResponseWithBinary = Omit<GetAppResponse, 'binary'> & {
  binary: GetBinaryResponse
}

// type GetAppResponseWithTemplate = Omit<GetAppResponse, 'template'> & {
//   template: GetTemplateResponse
// }

/**
// * Fetching Apps List Type
**/

type AppsOrderingFields =
  | 'binary'
  | 'id'
  | 'name'
  | 'plan'
  | 'status'
  | 'template'

interface GetAppsQueryParams
  extends PaginationParams,
    OrderingParams<AppsOrderingFields> {
  api_type?: ApiType
  name?: string
  binary?: number
  status?: number
  plan?: number
  template?: number
}

type GetAppsResponseItem = Pick<
  AppResource,
  | 'api_type'
  | 'binary'
  | 'comment'
  | 'id'
  | 'name'
  | 'networks'
  | 'plan'
  | 'plan_id'
  | 'status'
  | 'url'
>

type GetAppsResponse = Array<GetAppsResponseItem>

/**
// * Create Types
**/

type CreateAppResource = Pick<
  AppResource,
  'api_type' | 'status' | 'env' | 'rsp_headers' | 'secrets' | 'comment'
> &
  Partial<Pick<AppResource, 'name'>>

type CreateAppFromBinaryResource = CreateAppResource &
  Pick<AppResource, 'binary'>
type CreateAppFromTemplateResource = CreateAppResource &
  Pick<AppResource, 'template'>

type CreateAppResponse = Pick<
  AppResource,
  'id' | 'api_type' | 'binary' | 'name' | 'url' | 'status' | 'plan' | 'plan_id'
>

/**
// * Update Types
**/

// todo - figure out what is actually required for update success
type UpdateAppResource = Pick<
  AppResource,
  | 'id'
  | 'api_type'
  | 'binary'
  | 'status'
  | 'env'
  | 'rsp_headers'
  | 'secrets'
  | 'comment'
  | 'url'
> &
  Partial<Pick<AppResource, 'name'>>

/**
// * Enhanced App Types
**/

interface EnhancedAppResponse<T = GetAppResponse> extends Promise<T> {
  includeBinary(): EnhancedAppResponse<GetAppResponseWithBinary>
  // includeTemplate(): EnhancedAppResponse<GetAppResponseWithTemplate>
}

export type {
  CreateAppFromBinaryResource,
  CreateAppFromTemplateResource,
  CreateAppResponse,
  EnhancedAppResponse,
  GetAppResponse,
  GetAppResponseWithBinary,
  GetAppsQueryParams,
  GetAppsResponse,
  UpdateAppResource
}
