import { api } from '@/api/client'
import { toPaginated, type Paginated, type Pagination } from '@/api/pagination'
import type { components } from '@/api/types.gen'

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

export type DebtKpis = components['schemas']['DebtKpis']

/**
 * One board row. In the ON_HOLD bucket a row is a held customer (GAP-026): `invoiceId`,
 * `invoiceNumber` and `dueDate` are the oldest SENT invoice and can be null, and `amount` is
 * the customer's total outstanding.
 */
export type DebtBoardItem = components['schemas']['DebtBoardRow']

export type DebtBoardParams = {
  bucket: DebtBucket
  roundId?: string
  paymentMethod?: DebtPaymentMethodParam
  /** Matched server-side against customer name / address. */
  search?: string
  /** 1-based. */
  page?: number
  /** Default 50, max 100 (server-side). */
  pageSize?: number
}

export type DebtBoardPagination = Pagination

/** GET /debt/board is paginated (performance handoff 2026-10-16). */
export type DebtBoardResult = Paginated<DebtBoardItem>

/** POST /debt/:id/remind — `channel` omitted / AUTO = SMS if a mobile, else email (GAP-034). */
export type DebtRemindInput = components['schemas']['DebtRemindInput']

export type DebtPaymentLinkInput = components['schemas']['DebtPaymentLinkInput']

export type DebtMessageResult = components['schemas']['ReminderResult']

/** POST /debt/:id/payment-link — always a Stripe Checkout `url` (the static pay link is gone). */
export type DebtPaymentLinkResult = components['schemas']['PaymentLinkResult']

/** PATCH /debt/:id/hold body. `notify` sends the SMS. */
export type DebtHoldInput = components['schemas']['DebtHoldInput']

/** GET /debt/board/counts — every tab's total in one call. `ALL` is the catch-all tab. */
export type DebtBoardCounts = Partial<Record<Exclude<DebtBucket, 'INVOICE_SENT'> | 'ALL', number>>

/** GET /debt/:id — invoice detail the board row doesn't carry. */
export type DebtInvoiceDetail = {
  invoiceId: string
  invoiceNumber: string
  amount: number
  dueDate: string
  status: string
  customerId: string
  customerName: string
  phone: string | null
  email: string | null
  roundId: string | null
  roundName: string | null
  nextVisitDate: string | null
  mandateId: string | null
  mandateStatus: string | null
  recentVisits: { visitId: string; date: string; status: string; amount: number }[]
}

export type DebtBadDebtResult = {
  customerId: string
  badDebt: boolean
}

export type DebtHoldResult = components['schemas']['HoldFlagResult']

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
  if (params.search) search.set('search', params.search)
  if (params.page) search.set('page', String(params.page))
  if (params.pageSize) search.set('pageSize', String(params.pageSize))
  return `?${search.toString()}`
}

export const debtApi = {
  kpis: (signal?: AbortSignal) => api<DebtKpis>('/debt/kpis', { signal }),

  // Returns { rows, pagination }. An un-migrated backend still returns a bare array — wrap it
  // as one page so the frontend can ship before or after the backend change.
  board: async (params: DebtBoardParams, signal?: AbortSignal): Promise<DebtBoardResult> => {
    const body = await api<DebtBoardResult | DebtBoardItem[]>(`/debt/board${toQuery(params)}`, {
      signal,
    })
    return toPaginated(body)
  },

  counts: (
    params: Pick<DebtBoardParams, 'roundId' | 'paymentMethod' | 'search'>,
    signal?: AbortSignal,
  ) => {
    const search = new URLSearchParams()
    if (params.roundId) search.set('roundId', params.roundId)
    if (params.paymentMethod) search.set('paymentMethod', params.paymentMethod)
    if (params.search) search.set('search', params.search)
    const qs = search.toString()
    return api<DebtBoardCounts>(`/debt/board/counts${qs ? `?${qs}` : ''}`, { signal })
  },

  detail: (invoiceId: string, signal?: AbortSignal) =>
    api<DebtInvoiceDetail>(`/debt/${encodeURIComponent(invoiceId)}`, { signal }),

  remind: (invoiceId: string, input: DebtRemindInput) =>
    api<DebtMessageResult>(
      `/debt/${encodeURIComponent(invoiceId)}/remind`,
      jsonRequest('POST', input),
    ),

  paymentLink: (invoiceId: string, input: DebtPaymentLinkInput) =>
    api<DebtPaymentLinkResult>(
      `/debt/${encodeURIComponent(invoiceId)}/payment-link`,
      jsonRequest('POST', input),
    ),

  setBadDebt: (invoiceId: string, flag: boolean) =>
    api<DebtBadDebtResult>(
      `/debt/${encodeURIComponent(invoiceId)}/bad-debt`,
      jsonRequest('PATCH', { flag }),
    ),

  setHold: (invoiceId: string, input: DebtHoldInput) =>
    api<DebtHoldResult>(
      `/debt/${encodeURIComponent(invoiceId)}/hold`,
      jsonRequest('PATCH', input),
    ),
}
