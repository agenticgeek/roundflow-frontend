import type { components } from '@/api/types.gen'

/** `paymentStatus` on GET /customers rows and GET /customers/:id `standingInfo` (GAP-021). */
export type CustomerPaymentStatusValue = components['schemas']['CustomerPaymentStatus']

/** The Customers list badge — one per server value. */
export type CustomerPaymentBadge = 'none' | 'paid' | 'unpaid' | 'overdue' | 'hold' | 'failed'

/** What Property detail shows for a customer's payment standing (overdue and failed read "pending"). */
export type PaymentStanding = 'paid' | 'hold' | 'pending' | 'unpaid' | 'none'

const BADGES: Record<CustomerPaymentStatusValue, CustomerPaymentBadge> = {
  NONE: 'none',
  PAID: 'paid',
  UNPAID: 'unpaid',
  OVERDUE: 'overdue',
  ON_HOLD: 'hold',
  FAILED: 'failed',
}

/**
 * The backend only sends the uppercase enum (customer-payment-status.ts) — the old lowercase
 * values are gone, with no fallback. Anything unknown, or a customer with no invoices, is
 * `none`: never shown as paid.
 */
export function mapCustomerPaymentBadge(status: string | null | undefined): CustomerPaymentBadge {
  return BADGES[status as CustomerPaymentStatusValue] ?? 'none'
}

export function mapPaymentStanding(status: string | null | undefined): PaymentStanding {
  const badge = mapCustomerPaymentBadge(status)
  return badge === 'overdue' || badge === 'failed' ? 'pending' : badge
}
