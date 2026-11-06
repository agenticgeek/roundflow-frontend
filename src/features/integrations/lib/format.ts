import { failedMessagesContent as copy } from '@/content/integrations'
import { errorMessage, ApiError } from '@/lib/errors'
import { getTenantTimeZone } from '@/lib/timezone'

/** `message.send` / `invoice_bulk.send` → "Message send" / "Invoice bulk send". */
export function eventLabel(eventType: string): string {
  const words = eventType.replace(/[._-]+/g, ' ').trim()
  return words.charAt(0).toUpperCase() + words.slice(1)
}

/** `5 Nov, 10:30` in the business time zone. */
export function formatFailedAt(iso: string): string {
  const timeZone = getTenantTimeZone()
  const date = new Intl.DateTimeFormat('en-GB', { timeZone, day: 'numeric', month: 'short' }).format(new Date(iso))
  const time = new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(iso))
  return `${date}, ${time}`
}

/** Plain text for a failed replay: the known outbox codes first, else the shared friendly message. */
export function replayErrorMessage(error: unknown): string {
  const known = error instanceof ApiError && error.code ? copy.errors[error.code] : undefined
  return known ?? errorMessage(error)
}
