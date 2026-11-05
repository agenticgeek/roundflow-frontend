import type { PaymentMethod } from '@/api/types'

/** The one list of payment methods the API accepts — every picker and label reads from here. */
export const PAYMENT_METHODS: readonly PaymentMethod[] = ['GOCARDLESS', 'STRIPE', 'BACS', 'CASH', 'CHEQUE']

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  GOCARDLESS: 'Direct Debit (GoCardless)',
  STRIPE: 'Card link (Stripe)',
  BACS: 'Bank transfer',
  CASH: 'Cash',
  CHEQUE: 'Cheque',
}

export const PAYMENT_METHOD_OPTIONS: readonly { value: PaymentMethod; label: string }[] = PAYMENT_METHODS.map(
  (value) => ({ value, label: PAYMENT_METHOD_LABELS[value] }),
)
