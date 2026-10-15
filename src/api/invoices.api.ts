import { api, apiBlob } from '@/api/client'

/** CONTRACT-DIFF: `/invoices` not in generated OpenAPI yet — live per INVOICING_HANDOFF. */

export type InvoiceStatus = 'DRAFT' | 'SENT' | 'PAID'

export type InvoicePreviewCustomer = {
  name: string
  addressLine: string
  postcode: string | null
  email: string | null
  phone: string | null
}

export type InvoicePreviewLineItem = {
  description: string
  technicianName: string | null
  amount: number
}

export type InvoicePreviewBusiness = {
  name: string
  email: string | null
}

export type InvoicePreview = {
  invoiceNumber: string
  invoiceDate: string
  visitDate: string
  dueDate: string | null
  paymentMethod: string | null
  customer: InvoicePreviewCustomer
  lineItems: InvoicePreviewLineItem[]
  subtotal: number
  vatAmount: number
  total: number
  amount: number
  business: InvoicePreviewBusiness
}

export type InvoiceCreateInput = {
  visitId: string
  dueDate?: string | null
  notes?: string | null
  sendEmail?: boolean
}

export type InvoiceCreateResult = {
  id: string
  invoiceNumber: string
  status: InvoiceStatus
  sentToCustomer: boolean
  sentAt: string | null
}

export type InvoiceRecord = {
  id: string
  invoiceNumber: string
  status: InvoiceStatus
  amount: number
  dueDate: string | null
  notes?: string | null
  sentToCustomer: boolean
  sentAt: string | null
  createdAt: string
  customerId: string
  visitId: string
}

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
    api<InvoiceCreateResult>('/invoices', jsonRequest('POST', input)),

  send: (id: string) =>
    api<InvoiceCreateResult>(`/invoices/${encodeURIComponent(id)}/send`, {
      method: 'POST',
    }),

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
