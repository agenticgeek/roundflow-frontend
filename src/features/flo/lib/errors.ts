import { floContent, type FloErrorCode } from '@/content/flo'
import { friendlyApiMessage } from '@/lib/api-error-copy'
import { ApiError } from '@/lib/errors'
import { isNetworkError } from '@/lib/network-error'
import type { FloStreamError } from '@/features/flo/lib/stream-reducer'

const known = (code: string | undefined): code is FloErrorCode => code !== undefined && code in floContent.errors

/** Plain copy and retry flag for a Flo error code. An unknown code keeps the server's own message. */
export function describeFloError(code: string | undefined, serverMessage = '', retryableHint = true): FloStreamError {
  if (known(code)) return { code, ...floContent.errors[code] }
  return { code: code ?? 'UNKNOWN', message: serverMessage || floContent.errors.UNKNOWN.message, retryable: retryableHint }
}

/** An `error` SSE event: our copy for a known code, the server's message otherwise. */
export function errorFromEvent(error: FloStreamError): FloStreamError {
  return describeFloError(error.code, error.message, error.retryable)
}

/** Anything thrown before or during a Flo request. 429 `RATE_LIMITED` keeps the shared copy and Retry-After. */
export function errorFromThrown(thrown: unknown): FloStreamError {
  if (thrown instanceof ApiError) {
    if (known(thrown.code)) return describeFloError(thrown.code)
    const friendly = friendlyApiMessage(thrown)
    return friendly
      ? { code: thrown.code ?? 'RATE_LIMITED', message: friendly, retryable: thrown.status === 429 }
      : describeFloError(thrown.code, thrown.message, thrown.status >= 500)
  }
  return describeFloError(isNetworkError(thrown) ? 'NETWORK' : 'UNKNOWN')
}
