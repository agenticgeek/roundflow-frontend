import { apiErrorsContent as copy } from '@/content/api-errors'
import { ApiError } from '@/lib/errors'
import { fillCopy } from '@/lib/utils'

/** A MANAGER (or any non-admin) hit an administrator-only action: `403 ADMIN_ONLY`. */
export function isAdminOnly(error: unknown): boolean {
  return error instanceof ApiError && error.status === 403 && error.code === 'ADMIN_ONLY'
}

/** Friendly text for ADMIN_ONLY, RATE_LIMITED (429) and PAYLOAD_TOO_LARGE (413); `null` for any other error. */
export function friendlyApiMessage(error: ApiError): string | null {
  if (isAdminOnly(error)) return copy.adminOnly
  if (error.status === 429 || error.code === 'RATE_LIMITED') {
    const seconds = error.retryAfterSeconds
    if (!seconds) return copy.rateLimited
    return fillCopy(copy.rateLimitedWait, { seconds, unit: seconds === 1 ? copy.secondOne : copy.secondMany })
  }
  if (error.status === 413 || error.code === 'PAYLOAD_TOO_LARGE') return copy.tooLarge
  return null
}

/** "Reference: <id>" so support can trace a server error (5xx with a `requestId`); otherwise `null`. */
export function referenceLine(error: unknown): string | null {
  if (!(error instanceof ApiError) || error.status < 500 || !error.requestId) return null
  return fillCopy(copy.reference, { id: error.requestId })
}
