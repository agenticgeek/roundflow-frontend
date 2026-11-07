import type { MessageBulkResult } from '@/api/messages.api'

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`

/**
 * One-line outcome of a broadcast, e.g. "Sent to 12 customers · 2 opted out · 1 failed".
 * `scheduledFor` messages read "Scheduled for 3 customers".
 */
export function summariseBroadcast(result: MessageBulkResult): string {
  const parts: string[] = []
  if (result.sent > 0) parts.push(`Sent to ${plural(result.sent, 'customer', 'customers')}`)
  if (result.scheduled > 0) parts.push(`Scheduled for ${plural(result.scheduled, 'customer', 'customers')}`)
  if (parts.length === 0) parts.push('No messages sent')
  if (result.skippedOptedOut > 0) parts.push(`${result.skippedOptedOut} opted out`)
  if (result.skippedNoContact > 0) parts.push(`${result.skippedNoContact} with no contact details`)
  if (result.skippedNoChannel > 0) parts.push(`${result.skippedNoChannel} with no way to reach them`)
  if (result.failed > 0) parts.push(`${result.failed} failed`)
  return parts.join(' · ')
}

/** A `datetime-local` value as an ISO timestamp, or null when it is empty, invalid or not in the future. */
export function futureIsoFromLocal(value: string, now: number = Date.now()): string | null {
  if (!value) return null
  const at = new Date(value)
  if (Number.isNaN(at.getTime()) || at.getTime() <= now) return null
  return at.toISOString()
}

/** Recipients that were not messaged (opted out, no contact details or failed), for a detail list. */
export function unmessagedRecipients(result: MessageBulkResult) {
  return result.recipients.filter((r) => r.status !== 'sent' && r.status !== 'scheduled')
}

export const RECIPIENT_STATUS_LABELS = {
  sent: 'Sent',
  scheduled: 'Scheduled',
  skipped_opted_out: 'Opted out of messages',
  skipped_no_contact: 'No contact details',
  skipped_no_channel: 'No way to reach them (no email, or SMS is not set up)',
  failed: 'Failed',
} as const
