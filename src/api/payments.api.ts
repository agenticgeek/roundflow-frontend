import { api, apiBlob } from '@/api/client'
import { toQueryString } from '@/api/invoices.api'
import type { components, paths } from '@/api/types.gen'

export type Payment = components['schemas']['Payment']
export type ManualPaymentStatus = components['schemas']['PaymentStatusInput']['status']

export type PaymentListRow = components['schemas']['PaymentListRow']
export type PaymentListFilters = NonNullable<paths['/payments']['get']['parameters']['query']>
export type PaymentListPage = { rows: PaymentListRow[]; pagination: components['schemas']['Pagination'] }
export type PaymentExportFilters = NonNullable<paths['/payments/export.csv']['get']['parameters']['query']>

export const paymentsApi = {
  /** GET /payments — paginated, newest first (GAP-028). */
  list: (filters: PaymentListFilters = {}, signal?: AbortSignal) =>
    api<PaymentListPage>(`/payments${toQueryString(filters)}`, { signal }),

  /** GET /payments/export.csv. */
  exportCsv: (filters: PaymentExportFilters = {}) =>
    apiBlob(`/payments/export.csv${toQueryString(filters)}`, { headers: { Accept: 'text/csv' } }),

  /**
   * Manually reconcile a BACS / cheque payment (no settlement webhook exists for those).
   * PAID also marks the visit's invoice paid. 409 if it isn't BACS/CHEQUE or is already paid.
   * GAP-027 part 1 — replaced by `POST /invoices/:id/mark-paid` once that ships.
   */
  setStatus: (id: string, status: ManualPaymentStatus) =>
    api<Payment>(`/payments/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
}
