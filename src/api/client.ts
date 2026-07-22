import { supabase } from '@/lib/supabase'
import { ApiError } from '@/lib/errors'

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
  const baseUrl = import.meta.env.VITE_API_URL as string | undefined
  if (!baseUrl) {
    throw new Error('Missing VITE_API_URL. Configure the RoundFlow API before loading server data.')
  }

  const { accessToken, headers, ...requestInit } = init
  const { data } = await supabase.auth.getSession()
  const token = accessToken ?? data.session?.access_token ?? ''
  const response = await fetch(`${baseUrl.replace(/\/$/, '')}${path}`, {
    ...requestInit,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
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
