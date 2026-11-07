import type { components } from '@/api/types.gen'
import { invoicesContent } from '@/content/invoices'

const copy = invoicesContent.bulkSend

/** How often the results panel asks for batch progress. */
export const BULK_SEND_POLL_MS = 2000

/** One invoice's outcome in a bulk send batch. */
export type BulkSendResult = components['schemas']['InvoiceBulkSendBatch']['results'][number]

export type CountRow = { key: string; label: string; count: number }

export function batchSummary(results: readonly BulkSendResult[]) {
  const count = (status: BulkSendResult['status']) => results.filter((result) => result.status === status).length
  const queued = count('QUEUED')
  return {
    total: results.length,
    sent: count('SENT'),
    failed: count('FAILED'),
    skipped: count('SKIPPED'),
    queued,
    done: results.length - queued,
  }
}

export function failedResults(results: readonly BulkSendResult[]): BulkSendResult[] {
  return results.filter((result) => result.status === 'FAILED')
}

/** Plain-language reason an invoice is skipped; unknown codes stay visible. */
export function skipReasonLabel(reason: string): string {
  return copy.skipReasons[reason] ?? copy.skipReasonFallback.replace('{reason}', reason)
}

/** `{ SMS: 3, EMAIL: 0 }` → rows with labels, zero counts dropped. */
export function channelRows(counts: Record<string, number> | undefined): CountRow[] {
  return Object.entries(counts ?? {})
    .filter(([, count]) => count > 0)
    .map(([key, count]) => ({ key, label: copy.channels[key] ?? key, count }))
}

export function skipRows(counts: Record<string, number> | undefined): CountRow[] {
  return Object.entries(counts ?? {})
    .filter(([, count]) => count > 0)
    .map(([key, count]) => ({ key, label: skipReasonLabel(key), count }))
}

/** Only drafts can be bulk-sent. */
export function selectableIds(rows: readonly { id: string; status: string }[]): string[] {
  return rows.filter((row) => row.status === 'DRAFT').map((row) => row.id)
}

export function selectionState(selectable: readonly string[], selected: ReadonlySet<string>): 'none' | 'some' | 'all' {
  const chosen = selectable.filter((id) => selected.has(id)).length
  if (chosen === 0) return 'none'
  return chosen === selectable.length ? 'all' : 'some'
}

export function toggleId(selected: ReadonlySet<string>, id: string): Set<string> {
  const next = new Set(selected)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  return next
}
