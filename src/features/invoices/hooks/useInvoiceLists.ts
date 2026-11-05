import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query'
import { invoicesApi, type InvoiceExportFilters, type InvoiceListFilters } from '@/api/invoices.api'
import { paymentsApi, type PaymentExportFilters, type PaymentListFilters } from '@/api/payments.api'
import { queryKeys } from '@/lib/query-keys'

export const INVOICE_LIST_PAGE_SIZE = 25

/** GET /invoices — keeps the current page on screen while the next loads (GAP-028). */
export function useInvoiceList(filters: InvoiceListFilters) {
  return useQuery({
    queryKey: queryKeys.invoices.list(filters),
    queryFn: ({ signal }) => invoicesApi.list({ pageSize: INVOICE_LIST_PAGE_SIZE, ...filters }, signal),
    placeholderData: keepPreviousData,
  })
}

/** GET /payments. */
export function usePaymentList(filters: PaymentListFilters) {
  return useQuery({
    queryKey: queryKeys.payments.list(filters),
    queryFn: ({ signal }) => paymentsApi.list({ pageSize: INVOICE_LIST_PAGE_SIZE, ...filters }, signal),
    placeholderData: keepPreviousData,
  })
}

/** CSV export of invoices or payments (fetch + blob, bearer header). The caller downloads it. */
export function useExportCsv() {
  return useMutation({
    mutationFn: (
      request: { kind: 'invoices'; filters: InvoiceExportFilters } | { kind: 'payments'; filters: PaymentExportFilters },
    ) => (request.kind === 'invoices' ? invoicesApi.exportCsv(request.filters) : paymentsApi.exportCsv(request.filters)),
    // The screen toasts the server's message itself.
    meta: { silenceGlobalError: true },
  })
}
