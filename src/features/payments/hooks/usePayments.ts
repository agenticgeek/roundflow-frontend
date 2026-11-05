import { useMutation, useQueryClient } from '@tanstack/react-query'
import { paymentsApi } from '@/api/payments.api'
import { invalidateCustomers, invalidateDashboard, invalidateDebt, invalidateInvoices } from '@/lib/query-keys'

/** Marks a pending BACS / cheque payment as received (`PATCH /payments/:id/status`). */
export function useMarkPaymentPaid() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (paymentId: string) => paymentsApi.setStatus(paymentId, 'PAID'),
    // The button shows the server's message itself.
    meta: { silenceGlobalError: true },
    onSuccess: () =>
      Promise.all([
        // Payments tab + header balance, the invoice it settles, and the debt board.
        invalidateCustomers(queryClient),
        invalidateInvoices(queryClient),
        invalidateDebt(queryClient),
        invalidateDashboard(queryClient),
      ]),
  })
}
