// Helper to create a minimal Response-like object
function createMockResponse<T>(options: { ok: boolean; data?: T }): Response {
  return {
    ok: options.ok,
    json: async () => options.data as T,
    // Add required Response properties with default values
    headers: new Headers(),
    redirected: false,
    status: options.ok ? 200 : 400,
    statusText: options.ok ? 'OK' : 'Bad Request',
    type: 'basic',
    url: '',
    clone: () => createMockResponse(options),
    body: null,
    bodyUsed: false,
    arrayBuffer: async () => new ArrayBuffer(0),
    blob: async () => new Blob(),
    formData: async () => new FormData(),
    text: async () => ''
  } as Response
}

export { createMockResponse }
