import { ROUTES } from '@/config/routes'
import { sharedActionsContent } from '@/content/shared-actions'
import { ApiError, errorMessage } from '@/lib/errors'

/** Error codes the send / remind / payment-link endpoints use for a fixable setup problem (GAP-034). */
export const MESSAGING_ERROR_CODES = [
  'STRIPE_NOT_CONNECTED',
  'GHL_NOT_CONNECTED',
  'NO_CONTACT_FOR_CHANNEL',
  'EMAIL_NOT_AVAILABLE',
  'GHL_SEND_FAILED',
  'CHANNEL_UNAVAILABLE',
  'CUSTOMER_OPTED_OUT',
] as const

export type MessagingErrorCode = (typeof MESSAGING_ERROR_CODES)[number]

export type MessagingErrorView = {
  /** The server's `error` — always shown as-is. */
  message: string
  code: MessagingErrorCode | null
  hint: string | null
  /** Where to fix it (Settings › Integrations), when there is somewhere to go. */
  cta: { label: string; to: string } | null
}

function isMessagingCode(code: string | undefined): code is MessagingErrorCode {
  return (MESSAGING_ERROR_CODES as readonly (string | undefined)[]).includes(code)
}

const REASON_ROUTES = { integrations: ROUTES.settingsIntegrations, email: ROUTES.settingsEmail } as const

/** Turns a failed send into the message plus a specific call to action. */
export function describeMessagingError(error: unknown): MessagingErrorView {
  const message = errorMessage(error)
  const code = error instanceof ApiError ? error.code : undefined
  if (!isMessagingCode(code)) return { message, code: null, hint: null, cta: null }
  const copy = sharedActionsContent.messagingErrors[code]
  if (code === 'CHANNEL_UNAVAILABLE') {
    // 409 CHANNEL_UNAVAILABLE: `reason` says which channel problem; unknown reasons keep the server's words.
    const reason = ((error as ApiError).body as { reason?: string } | undefined)?.reason
    const known = reason ? sharedActionsContent.channelReasons[reason] : undefined
    if (!known) return { message, code, hint: copy.hint, cta: null }
    return { message: known.message, code, hint: known.hint, cta: known.cta && known.to ? { label: known.cta, to: REASON_ROUTES[known.to] } : null }
  }
  return {
    message: 'message' in copy ? copy.message : message,
    code,
    hint: copy.hint,
    cta: copy.cta ? { label: copy.cta, to: ROUTES.settingsIntegrations } : null,
  }
}
