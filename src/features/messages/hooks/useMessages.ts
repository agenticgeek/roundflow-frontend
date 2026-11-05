import { useMutation, useQuery } from '@tanstack/react-query'
import { messagesApi } from '@/api/messages.api'
import type { MessageBulkInput, MessageChannel, MessageSendInput } from '@/api/messages.api'

/** Send a message to a single customer/property (SMS / email / WhatsApp). */
export function useSendMessage() {
  return useMutation({
    mutationFn: (input: MessageSendInput) => messagesApi.send(input),
    // Callers word their own message (e.g. "paused, but the SMS wasn't sent") — no second, raw toast.
    meta: { silenceGlobalError: true },
  })
}

/** The server-confirmed audience of a round broadcast (per-customer status for the channel). */
export function useBulkRecipients(
  query: { roundId: string; channel: MessageChannel; excludePaymentHold: boolean },
  enabled = true,
) {
  return useQuery({
    queryKey: ['messages', 'bulk-recipients', query.roundId, query.channel, query.excludePaymentHold] as const,
    queryFn: ({ signal }) => messagesApi.bulkRecipients(query, signal),
    enabled: enabled && Boolean(query.roundId),
  })
}

/** Send a message to every (deduped) recipient on a round. */
export function useBulkMessage() {
  return useMutation({
    mutationFn: (input: MessageBulkInput) => messagesApi.bulk(input),
  })
}
