import type { PaymentMethod } from '@/api/types'

/** Methods with no settlement webhook — the only ones `PATCH /payments/:id/status` accepts. */
const MANUAL_METHODS: readonly string[] = ['BACS', 'CHEQUE'] satisfies PaymentMethod[]

export type PaymentRowForReconcile = {
  paymentId?: string | null
  paymentStatus?: string | null
  /** Not in the OpenAPI PaymentRow yet, but the API sends it (`Payment.method`). */
  method?: string | null
}

/**
 * The payment id behind a Payments-tab row that the admin can mark as paid (GAP-027): a
 * BACS or cheque payment that exists and isn't PAID. `fallbackMethod` (the plan's method)
 * covers a response without `method`.
 */
export function reconcilablePaymentId(
  row: PaymentRowForReconcile,
  fallbackMethod?: string | null,
): string | null {
  if (!row.paymentId || row.paymentStatus === 'PAID') return null
  const method = row.method ?? fallbackMethod
  return method && MANUAL_METHODS.includes(method) ? row.paymentId : null
}
