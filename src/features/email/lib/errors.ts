import { emailSettingsContent as copy } from '@/content/email-settings'
import { describeMessagingError } from '@/features/messaging/lib/messaging-errors'
import { ApiError, errorMessage } from '@/lib/errors'

const codeOf = (error: unknown) => (error instanceof ApiError ? error.code : undefined)

/** Plain text for a failed email-settings call (400 validation codes, CHANNEL_UNAVAILABLE on the test email). */
export function emailSettingsErrorMessage(error: unknown): string {
  const code = codeOf(error)
  if (code && copy.errors[code]) return copy.errors[code]
  if (code === 'CHANNEL_UNAVAILABLE') return describeMessagingError(error).message
  return errorMessage(error)
}

/** Same for the sending-domain calls: the domain codes first (free-mail refusal included), then the settings ones. */
export function domainErrorMessage(error: unknown): string {
  const code = codeOf(error)
  if (code && copy.domain.errors[code]) return copy.domain.errors[code]
  return emailSettingsErrorMessage(error)
}
