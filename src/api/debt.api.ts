import { api } from '@/api/client'

/** CONTRACT-DIFF: `/debt/*` not in generated OpenAPI yet — live per DEBT_BOARD_HANDOFF. */

export type DebtBucket =
  | 'INVOICE_SENT'
  | 'DUE_BEFORE_CLEAN'
  | 'FAILED_GC'
  | 'SEVEN_DAYS_OVER'
  | 'FOURTEEN_DAYS_OVER'
  | 'ON_HOLD'
  | 'BAD_DEBT'

export type DebtPaymentMethodParam =
  | 'GOCARDLESS'
  | 'CASH'
  | 'CHEQUE'
  | 'BACS'
  | 'STRIPE'

export type DebtRemindChannel = 'EMAIL' | 'SMS' | 'WHATSAPP'

export type DebtKpis = {
  totalOutstandings: number
  totalOutstandingsCount: number
  failedGoCardless: number
  dueBeforeClean: number
  holdNextClean: number
  badDebt: number
  badDebtCount: number
}

export type DebtBoardItem = {
  invoiceId: string
  invoiceNumber: string
  amount: number
  dueDate: string
  customerId: string
  customerName: string
  addressLine: string
  postcode: string | null
  paymentMethod: DebtPaymentMethodParam | string
  lastContactedAt: string | null
  badDebt: boolean
  holdNextClean: boolean
}

export type DebtBoardParams = {
  bucket: DebtBucket
  roundId?: string
  paymentMethod?: DebtPaymentMethodParam
}

export type DebtRemindInput = {
  channel: DebtRemindChannel
  message: string
}

export type DebtPaymentLinkInput = {
  message: string
}

export type DebtMessageResult = {
  id: string
}

export type DebtBadDebtResult = {
  customerId: string
  badDebt: boolean
}

export type DebtHoldResult = {
  customerId: string
  holdNextClean: boolean
}

function jsonRequest(method: 'POST' | 'PATCH', body?: unknown): RequestInit {
  return {
    method,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  }
}

function toQuery(params: DebtBoardParams): string {
  const search = new URLSearchParams()
  search.set('bucket', params.bucket)
  if (params.roundId) search.set('roundId', params.roundId)
  if (params.paymentMethod) search.set('paymentMethod', params.paymentMethod)
  return `?${search.toString()}`
}

export const debtApi = {
  kpis: (signal?: AbortSignal) => api<DebtKpis>('/debt/kpis', { signal }),

  board: (params: DebtBoardParams, signal?: AbortSignal) =>
    api<DebtBoardItem[]>(`/debt/board${toQuery(params)}`, { signal }),

  remind: (invoiceId: string, input: DebtRemindInput) =>
    api<DebtMessageResult>(
      `/debt/${encodeURIComponent(invoiceId)}/remind`,
      jsonRequest('POST', input),
    ),

  paymentLink: (invoiceId: string, input: DebtPaymentLinkInput) =>
    api<DebtMessageResult>(
      `/debt/${encodeURIComponent(invoiceId)}/payment-link`,
      jsonRequest('POST', input),
    ),

  setBadDebt: (invoiceId: string, flag: boolean) =>
    api<DebtBadDebtResult>(
      `/debt/${encodeURIComponent(invoiceId)}/bad-debt`,
      jsonRequest('PATCH', { flag }),
    ),

  setHold: (invoiceId: string, flag: boolean) =>
    api<DebtHoldResult>(
      `/debt/${encodeURIComponent(invoiceId)}/hold`,
      jsonRequest('PATCH', { flag }),
    ),
}
