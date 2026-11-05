import type { ManualPaymentMethod } from '@/api/invoices.api'

const MANUAL_METHODS: readonly string[] = ['BACS', 'CHEQUE', 'CASH'] satisfies ManualPaymentMethod[]

/** The plan / invoice method when it is one the admin can record by hand, else BACS. */
export function defaultManualMethod(method?: string | null): ManualPaymentMethod {
  return method && MANUAL_METHODS.includes(method) ? (method as ManualPaymentMethod) : 'BACS'
}
