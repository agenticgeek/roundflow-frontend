import { api } from '@/api/client'
import type { components } from '@/api/types.gen'

type Schemas = components['schemas']

export type BulkSendInput = Omit<Schemas['InvoiceBulkSendInput'], 'resend'> & { resend?: boolean }
/** The current view, narrowing a status selection (customer, search, dates). */
export type BulkSendFilters = NonNullable<Schemas['InvoiceBulkSendInput']['filters']>
/** What to send: explicit ids, or every invoice with `status` (default DRAFT) in the current view. */
export type BulkSendTarget = Omit<BulkSendInput, 'resend'>
export type BulkSendPreview = Schemas['InvoiceBulkSendPreview']
export type BulkSendStart = Schemas['InvoiceBulkSendQueued']
export type BulkSendBatch = Schemas['InvoiceBulkSendBatch']

function post(body: unknown): RequestInit {
  return { method: 'POST', body: JSON.stringify(body) }
}

export const invoiceBulkSendApi = {
  preview: (input: BulkSendTarget, signal?: AbortSignal) =>
    api<BulkSendPreview>('/invoices/bulk-send/preview', { ...post(input), signal }),

  start: (input: BulkSendInput) => api<BulkSendStart>('/invoices/bulk-send', post(input)),

  batch: (batchId: string, signal?: AbortSignal) =>
    api<BulkSendBatch>(`/invoices/bulk-send/${encodeURIComponent(batchId)}`, { signal }),
}
