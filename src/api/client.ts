import { supabase } from '@/lib/supabase'
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

export async function api<T>(path: string, init: ApiInit = {}): Promise<T> {
  const baseUrl = apiBaseUrl()

  const { accessToken, headers, ...requestInit } = init
  const { data } = await supabase.auth.getSession()
  const token = accessToken ?? data.session?.access_token ?? ''
  if (!token) {
    throw new ApiError(401, 'Not signed in')
  }

  const method = (requestInit.method ?? 'GET').toUpperCase()
  const hasBody = requestInit.body != null && method !== 'GET' && method !== 'HEAD'

  const response = await fetch(`${baseUrl}${path}`, {
    ...requestInit,
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
      ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
      ...(headers ?? {}),
    },
  })

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
