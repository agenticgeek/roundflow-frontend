import { describe, expect, it } from 'vitest'
import { mapCustomerPaymentBadge, mapPaymentStanding } from '@/features/customers/lib/payment-status'

describe('mapCustomerPaymentBadge (GAP-021)', () => {
  it.each([
    ['NONE', 'none'],
    ['PAID', 'paid'],
    ['UNPAID', 'unpaid'],
    ['OVERDUE', 'overdue'],
    ['ON_HOLD', 'hold'],
    ['FAILED', 'failed'],
    // The lowercase values are gone — no fallback, and never "paid".
    ['paid', 'none'],
    ['hold', 'none'],
    [undefined, 'none'],
    [null, 'none'],
  ])('%s -> %s', (input, expected) => {
    expect(mapCustomerPaymentBadge(input)).toBe(expected)
  })
})

describe('mapPaymentStanding', () => {
  it.each([
    ['PAID', 'paid'],
    ['ON_HOLD', 'hold'],
    ['OVERDUE', 'pending'],
    ['FAILED', 'pending'],
    ['UNPAID', 'unpaid'],
    ['NONE', 'none'],
    [undefined, 'none'],
  ])('%s -> %s', (input, expected) => {
    expect(mapPaymentStanding(input)).toBe(expected)
  })
})
