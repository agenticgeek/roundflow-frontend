import type { CustomerVisitRow } from '@/api/customer-records.api'
import type { PropertyVisitRecord, VisitPaymentStatus } from '@/content/property-detail'
import { formatDate, mapVisitStatus } from '@/features/customers/lib/mappers'

const VISIT_PAYMENTS: Partial<Record<string, VisitPaymentStatus>> = {
  PAID: 'paid',
  PROCESSING: 'processing',
  REFUNDED: 'refunded',
  DISPUTED: 'disputed',
  OVERDUE: 'overdue',
  FAILED: 'failed',
}

/**
 * GET /customers/:id/visits rows → Visit History rows (GAP-020). Includes CANCELLED visits
 * ("cancelled (paused)" chip). Invoice state is merged in afterwards from the customer's
 * invoices; only a COMPLETED visit can be invoiced (GAP-032).
 */
export function customerVisitsToRecords(rows: readonly CustomerVisitRow[]): PropertyVisitRecord[] {
  return rows.map((row, index) => ({
    id: row.visitId ?? `visit-${index}`,
    visitDate: formatDate(row.date),
    round: row.roundName ?? '—',
    technician: '—',
    status: mapVisitStatus(row.status, row.cancelReason),
    payment: VISIT_PAYMENTS[row.paymentStatus ?? ''] ?? 'pending',
    collectedVia: row.collectedVia && row.collectedVia !== 'NONE' ? row.collectedVia : null,
    price: '—',
    invoice: 'generate',
    invoiceId: null,
  }))
}

/** "Generate invoice" is only offered on a completed visit without one (GAP-032). */
export function canGenerateInvoice(visit: Pick<PropertyVisitRecord, 'status' | 'invoice'>): boolean {
  return visit.invoice === 'generate' && visit.status === 'completed'
}
