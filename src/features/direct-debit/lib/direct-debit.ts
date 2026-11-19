import type { DirectDebitStatus, MandateImportCandidate } from '@/api/direct-debit.api'
import { directDebitContent } from '@/content/direct-debit'
import { formatListDate } from '@/features/invoices/lib/list'

/** Mandate statuses that already cover the customer (no setup link is offered). */
export const MANDATE_IN_PLACE = new Set(['active', 'pending_customer_approval', 'pending_submission', 'submitted'])

/** "Not set up", "Setup link sent 18 Nov 2026", "Active", ... */
export function directDebitLabel(status: Pick<DirectDebitStatus, 'mandateStatus' | 'linkSentAt'>): string {
  const copy = directDebitContent.panel.statuses
  if (status.mandateStatus) return copy[status.mandateStatus] ?? status.mandateStatus
  if (status.linkSentAt) return copy.linkSent.replace('{date}', formatListDate(status.linkSentAt))
  return copy.none
}

/** Green when active, amber while being set up, red once it has ended; default colour with none. */
export function directDebitStatusClass(mandateStatus: string | null): string | undefined {
  if (mandateStatus === 'active') return 'text-success'
  if (mandateStatus && MANDATE_IN_PLACE.has(mandateStatus)) return 'text-warning'
  if (mandateStatus) return 'text-danger'
  return undefined
}

export type MandateChoice = { customerId: string; customerName: string }

/** The starting pick for each import row: its suggested customer (nothing for an ambiguous or already-linked row). */
export function initialChoices(rows: MandateImportCandidate[]): Record<string, MandateChoice | null> {
  return Object.fromEntries(
    rows.map((row) => [
      row.mandateId,
      !row.linkedCustomerId && row.suggestion ? { customerId: row.suggestion.customerId, customerName: row.suggestion.customerName } : null,
    ]),
  )
}
