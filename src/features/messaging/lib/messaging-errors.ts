import { ROUTES } from '@/config/routes'
import { sharedActionsContent } from '@/content/shared-actions'
import { ApiError, errorMessage } from '@/lib/errors'

/** Error codes the send / remind / payment-link endpoints use for a fixable setup problem (GAP-034). */
export const MESSAGING_ERROR_CODES = [
  'STRIPE_NOT_CONNECTED',
  'GHL_NOT_CONNECTED',
  'NO_CONTACT_FOR_CHANNEL',
  'GHL_SEND_FAILED',
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

/** Turns a failed send into the message plus a specific call to action. */
export function describeMessagingError(error: unknown): MessagingErrorView {
  const message = errorMessage(error)
  const code = error instanceof ApiError ? error.code : undefined
  if (!isMessagingCode(code)) return { message, code: null, hint: null, cta: null }
  const copy = sharedActionsContent.messagingErrors[code]
  return {
    message,
    code,
    hint: copy.hint,
    cta: copy.cta ? { label: copy.cta, to: ROUTES.settingsIntegrations } : null,
  }
}
