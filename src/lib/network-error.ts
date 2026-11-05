import { appErrorsContent } from '@/content/app-errors'

/**
 * `fetch` itself failed — offline, DNS, CORS, the API down. Distinct from `ApiError` (the
 * server answered): only these get the generic "Can't reach RoundFlow" + Retry (GAP-005).
 */
export class NetworkError extends Error {
  constructor(public readonly cause?: unknown) {
    super(appErrorsContent.network.message)
    this.name = 'NetworkError'
  }
}

export function isNetworkError(error: unknown): error is NetworkError {
  return error instanceof NetworkError
}

/** Wraps a fetch so transport failures become `NetworkError`; aborts pass through untouched. */
export async function fetchOrNetworkError(input: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(input, init)
  } catch (error) {
    // A cancelled query isn't a connection problem (DOMException differs across realms, so match the name).
    if ((error as { name?: unknown } | null)?.name === 'AbortError') throw error
    throw new NetworkError(error)
  }
}
