import { api } from '@/api/client'
import type { components } from '@/api/types.gen'

/** `send` is hand-typed (live per the 2026-10-13 backend response); the bulk types come from the generated OpenAPI. */

export type MessageChannel = 'sms' | 'email' | 'whatsapp'

/** One of propertyId / customerId is required. */
export type MessageSendInput = {
  propertyId?: string
  customerId?: string
  channel: MessageChannel
  body: string
}

export type MessageSendResult = { status: 'sent' }

type Schemas = components['schemas']

/** `excludePaymentHold` defaults to false server-side, so callers may omit it. */
export type MessageBulkInput = Omit<Schemas['MessageBulkInput'], 'excludePaymentHold'> & {
  excludePaymentHold?: boolean
}
export type BroadcastRecipient = Schemas['BroadcastRecipient']
export type BroadcastRecipientStatus = BroadcastRecipient['status']
/** Per-recipient outcome of a round broadcast (also the notification part of a weather hold). */
export type MessageBulkResult = Schemas['MessageBulkResult']
export type BulkRecipient = Schemas['BulkRecipient']
export type BulkRecipientsResult = Schemas['BulkRecipientsResult']

function jsonRequest(method: 'POST', body?: unknown): RequestInit {
  return {
    method,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  }
}

export const messagesApi = {
  send: (input: MessageSendInput) =>
    api<MessageSendResult>('/messages/send', jsonRequest('POST', input)),

  bulk: (input: MessageBulkInput) =>
    api<MessageBulkResult>('/messages/bulk', jsonRequest('POST', input)),

  /** The server-confirmed audience of a round broadcast, with a per-customer status for the channel. */
  bulkRecipients: (
    query: { roundId: string; channel: MessageChannel; excludePaymentHold: boolean },
    signal?: AbortSignal,
  ) =>
    api<BulkRecipientsResult>(
      `/messages/bulk/recipients?${new URLSearchParams({ ...query, excludePaymentHold: String(query.excludePaymentHold) })}`,
      { signal },
    ),
}
