import type { NavigateFunction } from 'react-router-dom'
import type { Role } from '@/api/types'
import { ROUTES } from '@/config/routes'
import { friendlyApiMessage, referenceLine } from '@/lib/api-error-copy'
import { useUiStore } from '@/stores/ui.store'

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code?: string,
    public readonly fields?: Record<string, string>,
    /** The parsed error response, for endpoints that return structured detail (e.g. per-row errors). */
    public readonly body?: unknown,
    extra: { requestId?: string; retryAfterSeconds?: number } = {},
  ) {
    super(message)
    this.name = 'ApiError'
    this.requestId = extra.requestId
    this.retryAfterSeconds = extra.retryAfterSeconds
  }

  /** `X-Request-Id` of the failed response, for support to trace. */
  readonly requestId?: string
  /** `Retry-After` of a 429, in seconds. */
  readonly retryAfterSeconds?: number
}

/**
 * What to show for a failed action: the friendly text for ADMIN_ONLY / RATE_LIMITED / PAYLOAD_TOO_LARGE,
 * else the server's message, with "Reference: <id>" appended to a server error so support can trace it.
 */
export function errorMessage(error: unknown): string {
  if (!(error instanceof Error)) return 'Something went wrong. Please try again.'
  if (error instanceof ApiError) {
    const friendly = friendlyApiMessage(error)
    if (friendly) return friendly
    const reference = referenceLine(error)
    if (reference) return `${error.message} ${reference}`
  }
  return error.message
}

export function handleForbidden(
  error: ApiError,
  role: Role | undefined,
  navigate: NavigateFunction,
) {
  switch (error.code) {
    case 'SETUP_INCOMPLETE':
      navigate(ROUTES.setupWizard, { replace: true })
      return
    case 'SETUP_ALREADY_COMPLETE':
      navigate(ROUTES.home, { replace: true })
      return
    case 'ROLE_FORBIDDEN':
      useUiStore.getState().pushToast({
        message: "You don't have permission to do that.",
        tone: 'error',
      })
      return
    default:
      // BACKEND-GAP: live 403 responses do not yet include a code.
      if (role === 'TECHNICIAN') {
        useUiStore.getState().pushToast({
          message: "You don't have permission to do that.",
          tone: 'error',
        })
        return
      }
      navigate(ROUTES.setupWizard, { replace: true })
  }
}
