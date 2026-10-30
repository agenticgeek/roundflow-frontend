import { describe, expect, it } from 'vitest'
import { reconcilablePaymentId } from '@/features/payments/lib/mark-paid'

describe('reconcilablePaymentId', () => {
  it('returns the id of an unpaid BACS / cheque payment', () => {
    expect(reconcilablePaymentId({ paymentId: 'p1', paymentStatus: 'PENDING', method: 'BACS' })).toBe('p1')
    expect(reconcilablePaymentId({ paymentId: 'p1', paymentStatus: 'OVERDUE', method: 'CHEQUE' })).toBe('p1')
  })

  it('falls back to the plan method when the row has none', () => {
    expect(reconcilablePaymentId({ paymentId: 'p1', paymentStatus: 'PENDING' }, 'CHEQUE')).toBe('p1')
    expect(reconcilablePaymentId({ paymentId: 'p1', paymentStatus: 'PENDING', method: null }, null)).toBeNull()
  })

  it('ignores paid, webhook-settled and payment-less rows', () => {
    expect(reconcilablePaymentId({ paymentId: 'p1', paymentStatus: 'PAID', method: 'BACS' })).toBeNull()
    expect(reconcilablePaymentId({ paymentId: 'p1', paymentStatus: 'PENDING', method: 'GOCARDLESS' })).toBeNull()
    expect(reconcilablePaymentId({ paymentId: null, paymentStatus: 'PENDING', method: 'BACS' })).toBeNull()
  })
})
