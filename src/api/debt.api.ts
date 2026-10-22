import { api } from '@/api/client'
import { toPaginated, type Paginated, type Pagination } from '@/api/pagination'

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

/** POST /debt/:id/payment-link — a Stripe Checkout link when Stripe is connected. */
export type DebtPaymentLinkResult = DebtMessageResult & {
  paymentUrl?: string
  provider?: 'stripe' | 'static'
  /** null for the static fallback link. */
  expiresAt?: string | null
}

/** PATCH /debt/:id/hold body (audit follow-up 2026-10-22). `notify` sends the SMS. */
export type DebtHoldInput = {
  flag: boolean
  reason?: string
  /** `YYYY-MM-DD` the hold starts. */
  date?: string
  notify?: boolean
  message?: string
}

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

export type DebtHoldResult = {
  customerId: string
  holdNextClean: boolean
  holdReason?: string | null
  holdSince?: string | null
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
