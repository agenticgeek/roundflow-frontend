import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { chatApi, type ChatMessage, type ChatMessagesPage } from '@/api/chat.api'
import { useAppBootstrap } from '@/providers/AppBootstrapProvider'

/** Chat is polled — there is no websocket. Threads and messages every 10 s, the badge a little slower. */
export const CHAT_POLL_MS = 10_000
const UNREAD_POLL_MS = 15_000

export const chatKeys = {
  all: ['chat'] as const,
  threads: ['chat', 'threads'] as const,
  unread: ['chat', 'unread'] as const,
  messages: (roundId: string) => ['chat', 'messages', roundId] as const,
  inbox: (customerId: string) => ['chat', 'inbox', customerId] as const,
}

export function useChatThreads(enabled = true) {
  return useQuery({
    queryKey: chatKeys.threads,
    queryFn: ({ signal }) => chatApi.threads(signal),
    refetchInterval: CHAT_POLL_MS,
    enabled,
  })
}

/** Total unread across rounds — drives the sidebar badge. Office roles only. */
export function useChatUnread() {
  const { canMutate } = useAppBootstrap()
  return useQuery({
    queryKey: chatKeys.unread,
    queryFn: ({ signal }) => chatApi.unread(signal),
    refetchInterval: UNREAD_POLL_MS,
    enabled: canMutate,
  })
}

/** Newest first-seen message time, so the next poll only asks for what is newer. */
export function lastMessageTime(messages: readonly ChatMessage[]): string | undefined {
  let latest: string | undefined
  for (const message of messages) {
    if (message.id.startsWith('tmp-')) continue
    if (!latest || message.createdAt > latest) latest = message.createdAt
  }
  return latest
}

/** Merge by id and clientMsgId (an optimistic row and its server copy are one message), oldest first. */
export function mergeMessages(existing: readonly ChatMessage[], incoming: readonly ChatMessage[]): ChatMessage[] {
  const merged = [...existing]
  for (const message of incoming) {
    const index = merged.findIndex(
      (item) => item.id === message.id || (message.clientMsgId && item.clientMsgId === message.clientMsgId && item.isMine),
    )
    if (index >= 0) merged[index] = message
    else merged.push(message)
  }
  return merged.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

/**
 * A round's messages. The first load takes the newest page; each poll then sends `since` (the
 * newest message time held) and merges what comes back into the cache.
 */
export function useChatMessages(roundId: string, enabled = true) {
  const queryClient = useQueryClient()
  return useQuery({
    queryKey: chatKeys.messages(roundId),
    queryFn: async ({ signal }): Promise<ChatMessage[]> => {
      const previous = queryClient.getQueryData<ChatMessage[]>(chatKeys.messages(roundId)) ?? []
      const since = lastMessageTime(previous)
      const page: ChatMessagesPage = await chatApi.messages(roundId, since ? { since } : {}, signal)
      return mergeMessages(previous, page.messages)
    },
    refetchInterval: CHAT_POLL_MS,
    enabled: enabled && Boolean(roundId),
  })
}

/** Optimistic send: the message shows at once as `tmp-<clientMsgId>`, then is replaced by the server row. */
export function useSendChatMessage(roundId: string) {
  const queryClient = useQueryClient()
  const key = chatKeys.messages(roundId)
  return useMutation({
    mutationFn: ({ text, clientMsgId }: { text: string; clientMsgId: string }) =>
      chatApi.send(roundId, { text, clientMsgId }),
    onMutate: ({ text, clientMsgId }) => {
      const optimistic: ChatMessage = {
        id: `tmp-${clientMsgId}`,
        roundId,
        senderProfileId: '',
        senderRole: 'OFFICE',
        body: text,
        type: 'TEXT',
        visitId: null,
        photoUrls: [],
        photoSignedUrls: [],
        clientMsgId,
        createdAt: new Date().toISOString(),
        isMine: true,
      }
      queryClient.setQueryData<ChatMessage[]>(key, (current) => mergeMessages(current ?? [], [optimistic]))
    },
    onSuccess: (message) => {
      queryClient.setQueryData<ChatMessage[]>(key, (current) => mergeMessages(current ?? [], [message]))
      void queryClient.invalidateQueries({ queryKey: chatKeys.threads })
    },
    onError: (_error, { clientMsgId }) => {
      queryClient.setQueryData<ChatMessage[]>(key, (current) =>
        (current ?? []).filter((message) => message.id !== `tmp-${clientMsgId}`),
      )
    },
  })
}

export function useMarkChatRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (roundId: string) => chatApi.markRead(roundId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: chatKeys.threads })
      void queryClient.invalidateQueries({ queryKey: chatKeys.unread })
    },
  })
}

/** Inbound customer replies for one customer (GET /messages/inbox?customerId=). */
export function useCustomerInbox(customerId: string, enabled = true) {
  return useQuery({
    queryKey: chatKeys.inbox(customerId),
    queryFn: ({ signal }) => chatApi.inbox({ customerId }, signal),
    refetchInterval: CHAT_POLL_MS * 3,
    enabled: enabled && Boolean(customerId),
  })
}

export function useMarkInboxRead(customerId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => chatApi.markInboxRead({ customerId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: chatKeys.inbox(customerId) }),
  })
}
