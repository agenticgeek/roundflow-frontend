import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  invoicesApi,
  type InvoiceSendInput,
  type MarkInvoicePaidInput,
} from '@/api/invoices.api'
import {
  invalidateCustomers,
  invalidateDashboard,
  invalidateDebt,
  invalidateInvoices,
  invalidatePayments,
  invalidateServiceChange,
} from '@/lib/query-keys'

/**
 * POST /invoices/:id/mark-paid (GAP-027 part 2). Paying can release a payment hold, so the
 * customer, Today's Work, planner and debt board all refresh.
 */
export function useMarkInvoicePaid() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ invoiceId, input }: { invoiceId: string; input: MarkInvoicePaidInput }) =>
      invoicesApi.markPaid(invoiceId, input),
    // The modal shows the server's message itself.
    meta: { silenceGlobalError: true },
    onSuccess: () =>
      Promise.all([
        invalidateInvoices(queryClient),
        invalidatePayments(queryClient),
        invalidateServiceChange(queryClient),
        invalidateDashboard(queryClient),
      ]),
  })
}

/** POST /invoices/:id/send with a channel (GAP-034); errors are shown inline with a CTA. */
export function useSendInvoiceVia() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ invoiceId, input }: { invoiceId: string; input: InvoiceSendInput }) =>
      invoicesApi.send(invoiceId, input),
    meta: { silenceGlobalError: true },
    onSuccess: () =>
      Promise.all([invalidateInvoices(queryClient), invalidateCustomers(queryClient), invalidateDebt(queryClient)]),
  })
}
