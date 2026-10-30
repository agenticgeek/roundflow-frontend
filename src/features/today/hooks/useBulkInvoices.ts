import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { invoicesApi, type InvoiceBulkInput } from '@/api/invoices.api'
import {
  invalidateCustomers,
  invalidateDashboard,
  invalidateDebt,
  invalidateInvoices,
  invalidateToday,
  queryKeys,
} from '@/lib/query-keys'

/** POST /invoices/bulk/preview for the day — nothing is saved (GAP-014). */
export function useBulkInvoicePreview(date: string, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.invoices.bulkPreview(date),
    queryFn: ({ signal }) => invoicesApi.bulkPreview({ date, excludeVisitIds: [] }, signal),
    enabled: enabled && Boolean(date),
    // Always re-check when the modal opens: visits complete all day.
    staleTime: 0,
  })
}

/** POST /invoices/bulk — creates (and optionally sends) the invoices. */
export function useCreateBulkInvoices() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: InvoiceBulkInput) => invoicesApi.bulkCreate(input),
    meta: { silenceGlobalError: true },
    onSuccess: () =>
      Promise.all([
        invalidateInvoices(queryClient),
        invalidateDebt(queryClient),
        invalidateCustomers(queryClient),
        invalidateToday(queryClient),
        invalidateDashboard(queryClient),
      ]),
  })
}
