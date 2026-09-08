import type {
  CustomerInvoiceListItem,
  InvoicePreview,
  InvoiceRecord,
} from '@/api/invoices.api'
import type { PropertyPaymentRecord, PropertyVisitRecord } from '@/content/property-detail'

export function formatInvoiceMoney(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return '—'
  return `£${value.toLocaleString('en-GB', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

export function formatInvoiceDate(iso: string | null | undefined) {
  if (!iso) return 'On receipt'
  const day = iso.slice(0, 10)
  const date = new Date(`${day}T00:00:00.000Z`)
  if (Number.isNaN(date.getTime())) return day
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

export function formatInvoiceDateLong(iso: string | null | undefined) {
  if (!iso) return '—'
  const day = iso.slice(0, 10)
  const date = new Date(`${day}T00:00:00.000Z`)
  if (Number.isNaN(date.getTime())) return day
  return date.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

export function formatInvoiceNumber(value: string) {
  return value.startsWith('#') ? value : `#${value}`
}

export function paymentMethodLabel(method: string | null | undefined) {
  if (!method) return '—'
  switch (method) {
    case 'GOCARDLESS':
      return 'GoCardless'
    case 'BACS':
      return 'BACS'
    case 'CASH':
      return 'Cash'
    case 'CHEQUE':
      return 'Cheque'
    case 'STRIPE':
      return 'Stripe'
    default:
      return method
  }
}

export function defaultDueDateIso(daysAhead = 14) {
  const date = new Date()
  date.setUTCDate(date.getUTCDate() + daysAhead)
  return date.toISOString().slice(0, 10)
}

export function vatPercentLabel(preview: InvoicePreview | undefined) {
  if (!preview || preview.subtotal <= 0 || preview.vatAmount <= 0) return 'VAT (0%)'
  const pct = Math.round((preview.vatAmount / preview.subtotal) * 100)
  return `VAT (${pct}%)`
}

export function invoiceRecordSummary(record: InvoiceRecord | undefined) {
  if (!record) return null
  return {
    number: formatInvoiceNumber(record.invoiceNumber),
    amount: formatInvoiceMoney(record.amount),
    due: formatInvoiceDate(record.dueDate),
    status: record.status,
  }
}

export function applyCustomerInvoicesToVisits(
  visits: PropertyVisitRecord[],
  invoices: CustomerInvoiceListItem[] | undefined,
): PropertyVisitRecord[] {
  if (!invoices?.length) return visits
  const byVisit = new Map(invoices.map((invoice) => [invoice.visitId, invoice]))
  return visits.map((visit) => {
    const invoice = byVisit.get(visit.id)
    if (!invoice) return visit
    return {
      ...visit,
      invoiceId: invoice.id,
      invoice: invoice.status === 'DRAFT' ? 'draft' : 'sent',
    }
  })
}

export function applyCustomerInvoicesToPayments(
  payments: PropertyPaymentRecord[],
  invoices: CustomerInvoiceListItem[] | undefined,
): PropertyPaymentRecord[] {
  if (!invoices?.length) return payments
  const byVisit = new Map(
    invoices.flatMap((invoice) =>
      invoice.visitId ? [[invoice.visitId, invoice] as const] : [],
    ),
  )
  return payments.map((payment) => {
    const invoice = payment.visitId ? byVisit.get(payment.visitId) : undefined
    if (!invoice) return payment
    return {
      ...payment,
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      invoice: invoice.status === 'DRAFT' ? 'draft' : 'sent',
      action: 'download' as const,
    }
  })
}
