import { describe, expect, it } from 'vitest'
import type { MessageBulkResult } from '@/api/messages.api'
import { RECIPIENT_STATUS_LABELS, futureIsoFromLocal, summariseBroadcast, unmessagedRecipients } from '@/features/messages/lib/broadcast-summary'

const result = (over: Partial<MessageBulkResult> = {}): MessageBulkResult => ({
  queued: 0, sent: 0, scheduled: 0, skippedOptedOut: 0, skippedNoContact: 0, skippedNoChannel: 0, failed: 0, scheduledFor: null, recipients: [], ...over,
})

describe('summariseBroadcast', () => {
  it('lists sent, opted-out, no-contact and failed counts', () => {
    expect(summariseBroadcast(result({ sent: 12, skippedOptedOut: 2, skippedNoContact: 3, failed: 1 }))).toBe(
      'Sent to 12 customers · 2 opted out · 3 with no contact details · 1 failed',
    )
  })

  it('counts customers with no usable channel, and labels every recipient status', () => {
    expect(summariseBroadcast(result({ sent: 2, skippedNoChannel: 3 }))).toBe('Sent to 2 customers · 3 with no way to reach them')
    expect(RECIPIENT_STATUS_LABELS.skipped_no_channel).toBe('No way to reach them (no email, or SMS is not set up)')
  })

  it('singularises and covers scheduled sends', () => {
    expect(summariseBroadcast(result({ sent: 1 }))).toBe('Sent to 1 customer')
    expect(summariseBroadcast(result({ scheduled: 3 }))).toBe('Scheduled for 3 customers')
  })

  it('says so when nothing went out', () => {
    expect(summariseBroadcast(result({ skippedOptedOut: 4 }))).toBe('No messages sent · 4 opted out')
  })
})

describe('unmessagedRecipients', () => {
  it('keeps only recipients that did not get (or have queued) a message', () => {
    const recipients = [
      { customerId: 'a', customerName: 'A', status: 'sent' as const },
      { customerId: 'b', customerName: 'B', status: 'scheduled' as const },
      { customerId: 'c', customerName: 'C', status: 'failed' as const, error: 'x' },
      { customerId: 'd', customerName: 'D', status: 'skipped_opted_out' as const },
    ]
    expect(unmessagedRecipients(result({ recipients })).map((r) => r.customerId)).toEqual(['c', 'd'])
  })
})

describe('futureIsoFromLocal', () => {
  const now = new Date('2026-11-03T12:00').getTime()

  it('returns an ISO timestamp for a future local time', () => {
    expect(futureIsoFromLocal('2026-11-04T09:00', now)).toBe(new Date('2026-11-04T09:00').toISOString())
  })

  it('returns null for empty, invalid or past values', () => {
    expect(futureIsoFromLocal('', now)).toBeNull()
    expect(futureIsoFromLocal('nonsense', now)).toBeNull()
    expect(futureIsoFromLocal('2026-11-03T11:00', now)).toBeNull()
  })
})
