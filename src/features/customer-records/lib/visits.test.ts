import { describe, expect, it } from 'vitest'
import { customerVisitsToRecords } from '@/features/customer-records/lib/visits'

describe('visit history collectedVia', () => {
  it('passes the recorded method through, and nothing for NONE or when absent', () => {
    const via = (collectedVia?: string | null) => customerVisitsToRecords([{ visitId: 'v', status: 'COMPLETED', collectedVia } as never])[0]!.collectedVia
    expect(via('BACS')).toBe('BACS')
    expect(via('NONE')).toBeNull()
    expect(via(null)).toBeNull()
    expect(via(undefined)).toBeNull()
  })
})

describe('visit history payment status (Wave 2B-1)', () => {
  it('keeps processing, refunded, disputed, overdue and failed payments distinct from pending', () => {
    const payment = (paymentStatus?: string) => customerVisitsToRecords([{ visitId: 'v', status: 'COMPLETED', paymentStatus: paymentStatus as never }])[0]!.payment
    expect(payment('PAID')).toBe('paid')
    expect(payment('PROCESSING')).toBe('processing')
    expect(payment('REFUNDED')).toBe('refunded')
    expect(payment('DISPUTED')).toBe('disputed')
    expect(payment('OVERDUE')).toBe('overdue')
    expect(payment('FAILED')).toBe('failed')
    expect(payment('PENDING')).toBe('pending')
    expect(payment('SOMETHING_NEW')).toBe('pending')
    expect(payment(undefined)).toBe('pending')
  })
})
