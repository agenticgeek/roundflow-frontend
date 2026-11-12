import { ApiError } from '@/lib/errors'

/** `Retry-After` in whole seconds; an HTTP date or garbage is ignored. */
export function parseRetryAfter(header: string | null): number | undefined {
  const text = header?.trim()
  return text && /^\d+$/.test(text) ? Number(text) : undefined
}

/**
 * Field errors as `{ path: message }`. Old endpoints send that shape already; new validators send
 * `[{ path, code, message }]` (Wave 2B-1).
 */
export function normaliseFields(fields: unknown): Record<string, string> | undefined {
  if (Array.isArray(fields)) {
    const entries = fields.flatMap((entry: unknown) => {
      const { path, message } = (typeof entry === 'object' && entry !== null ? entry : {}) as { path?: unknown; message?: unknown }
      return typeof path === 'string' && typeof message === 'string' ? [[path, message] as const] : []
    })
    return entries.length > 0 ? Object.fromEntries(entries) : undefined
  }
  if (typeof fields === 'object' && fields !== null) return fields as Record<string, string>
  return undefined
}

/** An ApiError from a non-2xx response and its parsed JSON body (support reference and Retry-After included). */
export function apiErrorFromResponse(response: Response, body: unknown): ApiError {
  const parsed = body as { error?: string; message?: string; code?: string; fields?: unknown; requestId?: unknown }
  const bodyRequestId = typeof parsed.requestId === 'string' ? parsed.requestId : undefined
  return new ApiError(
    response.status,
    parsed.error ?? parsed.message ?? 'Request failed',
    parsed.code,
    normaliseFields(parsed.fields),
    body,
    {
      requestId: response.headers.get('X-Request-Id') ?? bodyRequestId,
      retryAfterSeconds: parseRetryAfter(response.headers.get('Retry-After')),
    },
  )
}
