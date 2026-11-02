import { api } from '@/api/client'

/** CONTRACT-DIFF: `/chat/*` and `/messages/inbox` are not in the generated OpenAPI yet. */

export type ChatMessage = {
  id: string
  roundId: string
  senderProfileId: string
  senderRole: 'TECHNICIAN' | 'OFFICE'
  senderName?: string | null
  body: string | null
  type: 'TEXT' | 'PHOTOS' | 'WORK_PHOTOS'
  visitId: string | null
  photoUrls: string[]
  photoSignedUrls: string[]
  clientMsgId: string | null
  createdAt: string
  isMine: boolean
}

export type ChatThread = {
  roundId: string
  roundName: string
  technicians: { id: string; name: string; active: boolean }[]
  lastMessage: {
    id: string
    type: string
    body: string | null
    senderRole: 'TECHNICIAN' | 'OFFICE'
    senderProfileId: string
    createdAt: string
  } | null
  unreadCount: number
}

export type ChatMessagesPage = { messages: ChatMessage[]; hasMore: boolean }
export type ChatUnread = { total: number; rounds: { roundId: string; unread: number }[] }

export type InboxMessage = {
  id: string
  customerId: string
  customerName: string | null
  channel: string
  body: string
  receivedAt: string
  unread: boolean
}
export type InboxPage = {
  rows: InboxMessage[]
  unreadCount: number
  pagination: { page: number; pageSize: number; total: number; totalPages: number }
}

function post(body?: unknown): RequestInit {
  return { method: 'POST', ...(body === undefined ? {} : { body: JSON.stringify(body) }) }
}

export const chatApi = {
  threads: (signal?: AbortSignal) => api<{ threads: ChatThread[] }>('/chat/threads', { signal }),

  messages: (roundId: string, params: { since?: string; before?: string; limit?: number } = {}, signal?: AbortSignal) => {
    const search = new URLSearchParams()
    if (params.since) search.set('since', params.since)
    if (params.before) search.set('before', params.before)
    if (params.limit) search.set('limit', String(params.limit))
    const qs = search.toString()
    return api<ChatMessagesPage>(`/chat/rounds/${encodeURIComponent(roundId)}/messages${qs ? `?${qs}` : ''}`, { signal })
  },

  send: (roundId: string, input: { text: string; clientMsgId: string }) =>
    api<ChatMessage>(`/chat/rounds/${encodeURIComponent(roundId)}/messages`, post(input)),

  markRead: (roundId: string) =>
    api<{ roundId: string; lastReadAt: string }>(`/chat/rounds/${encodeURIComponent(roundId)}/read`, post()),

  unread: (signal?: AbortSignal) => api<ChatUnread>('/chat/unread-count', { signal }),

  inbox: (params: { customerId?: string; unreadOnly?: boolean; page?: number } = {}, signal?: AbortSignal) => {
    const search = new URLSearchParams()
    if (params.customerId) search.set('customerId', params.customerId)
    if (params.unreadOnly) search.set('unreadOnly', 'true')
    if (params.page) search.set('page', String(params.page))
    const qs = search.toString()
    return api<InboxPage>(`/messages/inbox${qs ? `?${qs}` : ''}`, { signal })
  },

  markInboxRead: (input: { ids?: string[]; customerId?: string }) =>
    api<{ updated: number }>('/messages/inbox/read', post(input)),
}
