import { getCachedAccessToken, refreshAccessToken } from '@/lib/supabase'
import { apiErrorFromResponse } from '@/lib/api-error'
import { ApiError } from '@/lib/errors'
import { apiBaseUrl } from '@/lib/env'
import { fetchOrNetworkError } from '@/lib/network-error'
import { handleSessionExpired } from '@/lib/session-expiry'

async function parseBody(response: Response): Promise<unknown> {
  return response.json().catch(() => ({}))
}

type ApiInit = RequestInit & {
  /** Prefer this token when provisioning immediately after SIGNED_IN. */
  accessToken?: string
  /**
   * Endpoint works without auth (e.g. GET /invites/:token): when signed out, send the
   * request without a bearer token instead of failing with "Not signed in".
   */
  public?: boolean
  /** Sent as `Idempotency-Key`: the same key on a retry makes the server run the action once. */
  idempotencyKey?: string
}

/** Auth, 401 refresh-and-retry and network-error handling shared by `api()`, `apiBlob()` and `apiStream()`. */
export async function requestWithAuth(path: string, init: ApiInit = {}): Promise<Response> {
  const baseUrl = apiBaseUrl()

  const { accessToken, headers, public: isPublic = false, idempotencyKey, ...requestInit } = init

  // Hot path: read the in-memory token so concurrent requests don't serialize on
  // the Supabase navigator lock. Cold start (cache not seeded yet) falls back to a
  // real session read.
  let token = accessToken ?? getCachedAccessToken() ?? (await refreshAccessToken()) ?? ''
  if (!token && !isPublic) {
    throw new ApiError(401, 'Not signed in')
  }

  const method = (requestInit.method ?? 'GET').toUpperCase()
  const hasBody = requestInit.body != null && method !== 'GET' && method !== 'HEAD'

  // A transport failure throws NetworkError (toast + Retry); an HTTP error stays an ApiError.
  const send = (bearer: string) =>
    fetchOrNetworkError(`${baseUrl}${path}`, {
      ...requestInit,
      headers: {
        Accept: 'application/json',
        ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
        ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
        ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
        ...(headers ?? {}),
      },
    })

  let response = await send(token)

  // The cached token can be stale after the tab was suspended (sleep/wake) before
  // autoRefresh caught up. Refresh once and retry — for every method: `send` re-sends the
  // same body. Never for an explicit `accessToken` override (provisioning) or a public call.
  if (response.status === 401 && !accessToken && !isPublic) {
    const refreshed = await refreshAccessToken()
    if (refreshed && refreshed !== token) {
      token = refreshed
      response = await send(token)
    }
    // Still 401: the session is gone. Sign out and go to Login with "Your session expired" (WEB-01).
    if (response.status === 401) await handleSessionExpired()
  }

  return response
}

export async function api<T>(path: string, init: ApiInit = {}): Promise<T> {
  const response = await requestWithAuth(path, init)

  if (response.status === 204) return undefined as T
  // Only reachable with `redirect: 'manual'`: the API answered with a redirect, i.e. success.
  if (response.type === 'opaqueredirect') return undefined as T

  const body = await parseBody(response)
  if (!response.ok) {
    throw apiErrorFromResponse(response, body)
  }

  return body as T
}

/**
 * Same auth handling as `api()` but returns the raw bytes — for endpoints that
 * stream a file (PDF, CSV) instead of JSON. On an error the body is still JSON,
 * so it's parsed and thrown as an ApiError just like `api()`.
 */
export async function apiBlob(path: string, init: ApiInit = {}): Promise<Blob> {
  const response = await requestWithAuth(path, init)

  if (!response.ok) {
    throw apiErrorFromResponse(response, await parseBody(response))
  }

  return response.blob()
}
