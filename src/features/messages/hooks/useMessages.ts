import { useMutation } from '@tanstack/react-query'
import { messagesApi } from '@/api/messages.api'
import type { MessageBulkInput, MessageSendInput } from '@/api/messages.api'

/** Send a message to a single customer/property (SMS / email / WhatsApp). */
export function useSendMessage() {
  return useMutation({
    mutationFn: (input: MessageSendInput) => messagesApi.send(input),
  })
}

/** Send a message to every (deduped) recipient on a round. */
export function useBulkMessage() {
  return useMutation({
    mutationFn: (input: MessageBulkInput) => messagesApi.bulk(input),
  })
}
