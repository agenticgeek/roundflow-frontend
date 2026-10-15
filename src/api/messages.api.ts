import { api } from '@/api/client'

/** CONTRACT-DIFF: `/messages/*` not in generated OpenAPI yet — live per the 2026-10-13 backend response. */

export type MessageChannel = 'sms' | 'email' | 'whatsapp'

/** One of propertyId / customerId is required. */
export type MessageSendInput = {
  propertyId?: string
  customerId?: string
  channel: MessageChannel
  body: string
}

export type MessageSendResult = { status: 'sent' }

export type MessageBulkInput = {
  roundId: string
  channel: MessageChannel
  body: string
  excludePaymentHold?: boolean
}

/** `queued` = recipients it was actually sent to (deduped by customer). */
export type MessageBulkResult = { queued: number }

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
}
