import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { invoiceBulkSendApi, type BulkSendTarget } from '@/api/invoice-bulk-send.api'
import { BULK_SEND_POLL_MS } from '@/features/invoices/lib/bulk-send'
import { invalidateInvoices } from '@/lib/query-keys'

/** POST /invoices/bulk-send/preview — counts by channel and skip reasons. Never cached. */
export function useBulkSendPreview(target: BulkSendTarget) {
  return useQuery({
    queryKey: ['bulk-send', 'preview', target],
    queryFn: ({ signal }) => invoiceBulkSendApi.preview(target, signal),
    gcTime: 0,
    staleTime: 0,
    retry: false,
  })
}

/** POST /invoices/bulk-send — queues the batch (202). The modal shows errors itself. */
export function useStartBulkSend() {
  return useMutation({
    mutationFn: (input: BulkSendTarget & { resend?: boolean }) => invoiceBulkSendApi.start(input),
    meta: { silenceGlobalError: true },
  })
}

/** GET /invoices/bulk-send/:batchId — polls until `done`, then refreshes the list. The key must not start with `invoices` or the refresh would re-trigger it. */
export function useBulkSendBatch(batchId: string | null) {
  const queryClient = useQueryClient()
  return useQuery({
    queryKey: ['bulk-send', 'batch', batchId],
    enabled: batchId !== null,
    gcTime: 0,
    retry: false,
    queryFn: async ({ signal }) => {
      const batch = await invoiceBulkSendApi.batch(batchId as string, signal)
      if (batch.done) await invalidateInvoices(queryClient)
      return batch
    },
    refetchInterval: (query) => (query.state.status === 'error' || query.state.data?.done ? false : BULK_SEND_POLL_MS),
  })
}
