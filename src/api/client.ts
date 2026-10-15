import { getCachedAccessToken, refreshAccessToken } from '@/lib/supabase'
import { ApiError } from '@/lib/errors'
import { apiBaseUrl } from '@/lib/env'

interface ApiErrorBody {
  error?: string
  message?: string
  code?: string
  fields?: Record<string, string>
}

async function parseBody(response: Response): Promise<unknown> {
  return response.json().catch(() => ({}))
}

type ApiInit = RequestInit & {
  /** Prefer this token when provisioning immediately after SIGNED_IN. */
  accessToken?: string
}

async function requestWithAuth(path: string, init: ApiInit = {}): Promise<Response> {
  const baseUrl = apiBaseUrl()

  const { accessToken, headers, ...requestInit } = init

  // Hot path: read the in-memory token so concurrent requests don't serialize on
  // the Supabase navigator lock. Cold start (cache not seeded yet) falls back to a
  // real session read.
  let token = accessToken ?? getCachedAccessToken() ?? (await refreshAccessToken()) ?? ''
  if (!token) {
    throw new ApiError(401, 'Not signed in')
  }

  const method = (requestInit.method ?? 'GET').toUpperCase()
  const hasBody = requestInit.body != null && method !== 'GET' && method !== 'HEAD'

  const send = (bearer: string) =>
    fetch(`${baseUrl}${path}`, {
      ...requestInit,
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${bearer}`,
        ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
        ...(headers ?? {}),
      },
    })

  let response = await send(token)

  // The cached token can be stale after the tab was suspended (sleep/wake) before
  // autoRefresh caught up. Refresh once and retry — but only when we used the cache,
  // never an explicit `accessToken` override (provisioning), and not for GET bodies.
  if (response.status === 401 && !accessToken && requestInit.body == null) {
    const refreshed = await refreshAccessToken()
    if (refreshed && refreshed !== token) {
      token = refreshed
      response = await send(token)
    }
  }

  return response
}

export async function api<T>(path: string, init: ApiInit = {}): Promise<T> {
  const response = await requestWithAuth(path, init)

  if (response.status === 204) return undefined as T

  const body = await parseBody(response)
  if (!response.ok) {
    const errorBody = body as ApiErrorBody
    throw new ApiError(
      response.status,
      errorBody.error ?? errorBody.message ?? 'Request failed',
      errorBody.code,
      errorBody.fields,
    )
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
    const errorBody = (await parseBody(response)) as ApiErrorBody
    throw new ApiError(
      response.status,
      errorBody.error ?? errorBody.message ?? 'Request failed',
      errorBody.code,
      errorBody.fields,
    )
  }

  return response.blob()
}
