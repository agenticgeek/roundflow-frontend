import type { InvoiceBulkPreview, InvoiceBulkResult } from '@/api/invoices.api'
import { todaysWorkContent } from '@/content/todays-work'

const copy = todaysWorkContent.bulkInvoices

export type BulkPreviewItem = InvoiceBulkPreview['items'][number]
export type BulkSkipReason = NonNullable<InvoiceBulkPreview['skipped'][number]['reason']>

/** "£246.00" — the server sends totals as strings ("246.00") and amounts as numbers. */
export function formatPounds(value: number | string | null | undefined): string {
  const amount = typeof value === 'string' ? Number(value) : (value ?? 0)
  return `£${(Number.isFinite(amount) ? amount : 0).toFixed(2)}`
}

export function skipReasonLabel(reason: BulkSkipReason | undefined): string {
  return reason ? copy.skipReasons[reason] : copy.skipReasons.NOT_COMPLETED
}

/** Live totals for the ticked items (the preview's own totals ignore client-side unticks). */
export function selectedTotals(items: readonly BulkPreviewItem[], excluded: ReadonlySet<string>) {
  const selected = items.filter((item) => !excluded.has(item.visitId ?? ''))
  const amount = selected.reduce((sum, item) => sum + (item.total ?? item.amount ?? 0), 0)
  return { count: selected.length, amount }
}

export type BulkFailure = { visitId: string; customerName: string; message: string }

/**
 * The result summary: "12 invoices, £246.00" plus one line per failure. An invoice created
 * but not sent (`sendNow`) is listed with its invoice number.
 */
export function summarizeBulkResult(result: InvoiceBulkResult, items: readonly BulkPreviewItem[]) {
  const names = new Map(items.map((item) => [item.visitId, item.customerName]))
  const numbers = new Map(result.created.map((row) => [row.invoiceId, row.invoiceNumber]))
  const headline = copy.resultHeadline
    .replace('{count}', String(result.totals.count ?? result.created.length))
    .replace('{amount}', formatPounds(result.totals.amount))
  const failures: BulkFailure[] = result.failed.map((row) => {
    const invoiceNumber = row.invoiceId ? numbers.get(row.invoiceId) : undefined
    const createdNotSent = row.invoiceId ? copy.createdNotSent.replace('{invoice}', invoiceNumber ?? row.invoiceId) : null
    return {
      visitId: row.visitId ?? '',
      customerName: names.get(row.visitId) ?? copy.unknownCustomer,
      message: [createdNotSent, row.error].filter(Boolean).join(': '),
    }
  })
  return {
    headline: failures.length > 0 ? `${headline} · ${copy.resultFailed.replace('{count}', String(failures.length))}` : headline,
    failures,
  }
}
