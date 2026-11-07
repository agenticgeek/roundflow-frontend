import { api, apiBlob } from '@/api/client'
import type { components, paths } from '@/api/types.gen'
import { idempotencyKeyFor } from '@/lib/idempotency'

export type InvoiceStatus = components['schemas']['InvoiceStatus']
export type InvoicePreviewLineItem = components['schemas']['InvoiceLineItem']
export type InvoicePreviewBusiness = components['schemas']['InvoiceBusiness']
type GeneratedPreview = components['schemas']['InvoicePreview']
/** The spec marks `customer` and `business` optional; the server always sends both. */
export type InvoicePreview = Omit<GeneratedPreview, 'customer' | 'business'> & {
  customer: NonNullable<GeneratedPreview['customer']>
  business: InvoicePreviewBusiness
}
export type InvoiceRecord = components['schemas']['InvoiceDetail']

/** The invoice's email outcome; documented on `POST /invoices` but not in the response schema. */
export type InvoiceEmailOutcome = {
  emailSent?: boolean
  pdfAttached?: boolean
  /** Present when `emailSent` is false: the invoice still exists (as a DRAFT). */
  emailError?: { code: string; message: string }
}

export type InvoiceCreateInput = components['schemas']['InvoiceCreateInput']
export type InvoiceCreateResult = components['schemas']['InvoiceActionResult'] & InvoiceEmailOutcome

export type CustomerInvoiceListItem = {
  id: string
  invoiceNumber: string
  status: InvoiceStatus
  amount: number
  dueDate: string | null
  sentToCustomer: boolean
  sentAt: string | null
  createdAt: string
  visitId: string
}

/** Delivery channel for send / remind / payment link (GAP-034). AUTO = SMS if a mobile, else email. */
export type SendChannel = 'AUTO' | 'SMS' | 'EMAIL' | 'WHATSAPP'

export type InvoiceSendInput = { channel?: SendChannel; resend?: boolean }
/** `pdfAttached` is documented but not in the schema: false when the email went without the PDF. */
export type InvoiceSendResult = components['schemas']['InvoiceSendResult'] & { pdfAttached?: boolean }

export type ManualPaymentMethod = 'BACS' | 'CHEQUE' | 'CASH'
export type MarkInvoicePaidInput = {
  method: ManualPaymentMethod
  reference?: string | null
  /** YYYY-MM-DD; the server defaults to now. */
  paidAt?: string | null
}
export type MarkInvoicePaidResult = components['schemas']['MarkPaidResult']

export type InvoiceListRow = components['schemas']['InvoiceListRow']
export type InvoiceListFilters = NonNullable<paths['/invoices']['get']['parameters']['query']>
export type InvoiceListPage = { rows: InvoiceListRow[]; pagination: components['schemas']['Pagination'] }
/** The spec types export `status` without OVERDUE although the description says "same filters as GET /invoices". */
export type InvoiceExportFilters = Omit<NonNullable<paths['/invoices/export.csv']['get']['parameters']['query']>, 'status'> & {
  status?: InvoiceListFilters['status']
}

export type InvoiceBulkPreview = components['schemas']['InvoiceBulkPreview']
export type InvoiceBulkResult = components['schemas']['InvoiceBulkResult']
export type InvoiceBulkInput = components['schemas']['InvoiceBulkInput'] & {
  sendNow?: boolean
  channel?: SendChannel
}

/** `{ a: 1, b: undefined, c: '' }` → `?a=1` (empty values dropped). */
export function toQueryString(params: Record<string, string | number | boolean | null | undefined>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue
    search.set(key, String(value))
  }
  const text = search.toString()
  return text ? `?${text}` : ''
}

function jsonRequest(method: 'POST', body?: unknown): RequestInit {
  return {
    method,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  }
}

export const invoicesApi = {
  preview: (visitId: string, signal?: AbortSignal) =>
    api<InvoicePreview>(
      `/invoices/preview?visitId=${encodeURIComponent(visitId)}`,
      { signal },
    ),

  create: (input: InvoiceCreateInput) =>
    api<InvoiceCreateResult>('/invoices', { ...jsonRequest('POST', input), idempotencyKey: idempotencyKeyFor(input) }),

  /** POST /invoices/:id/send — `channel` (GAP-034) and `resend` for an already-SENT invoice. */
  send: (id: string, input: InvoiceSendInput = {}) =>
    api<InvoiceSendResult>(`/invoices/${encodeURIComponent(id)}/send`, jsonRequest('POST', input)),

  /** POST /invoices/:id/mark-paid — BACS / cheque / cash, works with or without a payment row (GAP-027). */
  markPaid: (id: string, input: MarkInvoicePaidInput) =>
    api<MarkInvoicePaidResult>(`/invoices/${encodeURIComponent(id)}/mark-paid`, jsonRequest('POST', input)),

  /** GET /invoices — paginated, newest first (GAP-028). */
  list: (filters: InvoiceListFilters = {}, signal?: AbortSignal) =>
    api<InvoiceListPage>(`/invoices${toQueryString(filters)}`, { signal }),

  /** GET /invoices/export.csv — every row matching the filters. */
  exportCsv: (filters: InvoiceExportFilters = {}) =>
    apiBlob(`/invoices/export.csv${toQueryString(filters)}`, { headers: { Accept: 'text/csv' } }),

  /** POST /invoices/bulk/preview — what "Create invoices for today" would do (GAP-014). */
  bulkPreview: (input: components['schemas']['InvoiceBulkInput'], signal?: AbortSignal) =>
    api<InvoiceBulkPreview>('/invoices/bulk/preview', { ...jsonRequest('POST', input), signal }),

  /** POST /invoices/bulk — creates (and optionally sends) the day's invoices. */
  bulkCreate: (input: InvoiceBulkInput) => api<InvoiceBulkResult>('/invoices/bulk', jsonRequest('POST', input)),

  get: (id: string, signal?: AbortSignal) =>
    api<InvoiceRecord>(`/invoices/${encodeURIComponent(id)}`, { signal }),

  listByCustomer: (customerId: string, signal?: AbortSignal) =>
    api<CustomerInvoiceListItem[]>(
      `/customers/${encodeURIComponent(customerId)}/invoices`,
      { signal },
    ),

  /** PDF bytes for a SAVED invoice. */
  pdf: (id: string, signal?: AbortSignal) =>
    apiBlob(`/invoices/${encodeURIComponent(id)}/pdf`, {
      signal,
      headers: { Accept: 'application/pdf' },
    }),

  /** PDF bytes for a PREVIEW/quote, before the invoice is created. */
  previewPdf: (visitId: string, signal?: AbortSignal) =>
    apiBlob(`/invoices/preview/pdf?visitId=${encodeURIComponent(visitId)}`, {
      signal,
      headers: { Accept: 'application/pdf' },
    }),
}
