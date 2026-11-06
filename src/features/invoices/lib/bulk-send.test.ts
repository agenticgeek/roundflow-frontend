import { describe, expect, it } from 'vitest'
import {
  batchSummary,
  failedResults,
  skipReasonLabel,
  skipRows,
  channelRows,
  selectableIds,
  selectionState,
  toggleId,
  type BulkSendResult,
} from '@/features/invoices/lib/bulk-send'

const results: BulkSendResult[] = [
  { id: 'a', status: 'SENT' },
  { id: 'b', status: 'FAILED', error: 'Boom', code: 'GHL_SEND_FAILED' },
  { id: 'c', status: 'SKIPPED' },
  { id: 'd', status: 'QUEUED' },
]

describe('bulk send helpers (ACT-01)', () => {
  it('summarises a batch', () => {
    expect(batchSummary(results)).toEqual({ total: 4, sent: 1, failed: 1, skipped: 1, queued: 1, done: 3 })
    expect(failedResults(results).map((r) => r.id)).toEqual(['b'])
  })

  it('labels skip reasons in plain language, with a fallback', () => {
    expect(skipReasonLabel('CUSTOMER_OPTED_OUT')).toBe('Customer has opted out of messages')
    expect(skipReasonLabel('NO_AVAILABLE_CHANNEL')).toBe('No way to reach this customer (no email, and SMS is not set up)')
    expect(skipReasonLabel('NEW_ONE')).toBe('Skipped (NEW_ONE)')
  })

  it('turns counts into ordered rows and drops zeros', () => {
    expect(channelRows({ SMS: 3, EMAIL: 0, PUSH: 1 })).toEqual([
      { key: 'SMS', label: 'SMS', count: 3 },
      { key: 'PUSH', label: 'PUSH', count: 1 },
    ])
    expect(skipRows({ PAID: 2, CUSTOMER_OPTED_OUT: 0 })).toEqual([{ key: 'PAID', label: 'Already paid', count: 2 }])
    expect(skipRows(undefined)).toEqual([])
    expect(channelRows(undefined)).toEqual([])
  })

  it('selects only draft rows and reports tri-state', () => {
    const rows = [
      { id: '1', status: 'DRAFT' },
      { id: '2', status: 'SENT' },
      { id: '3', status: 'DRAFT' },
    ]
    expect(selectableIds(rows)).toEqual(['1', '3'])
    expect(selectionState(['1', '3'], new Set())).toBe('none')
    expect(selectionState(['1', '3'], new Set(['1']))).toBe('some')
    expect(selectionState(['1', '3'], new Set(['1', '3']))).toBe('all')
    expect(selectionState([], new Set())).toBe('none')
    expect(toggleId(new Set(['1']), '1').has('1')).toBe(false)
    expect(toggleId(new Set(), '2').has('2')).toBe(true)
  })
})
