import { useCallback, useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { floApi, type FloMessage, type FloMode } from '@/api/flo.api'
import { apiStream, readSseEvents } from '@/api/stream'
import { floContent } from '@/content/flo'
import { floKeys } from '@/features/flo/hooks/useFloStatus'
import { describeFloError, errorFromEvent, errorFromThrown } from '@/features/flo/lib/errors'
import {
  failStream,
  initialStream,
  parseFloEvent,
  reduceStream,
  stopStream,
  viewFromMessage,
  type FloStreamState,
} from '@/features/flo/lib/stream-reducer'
import { newIdempotencyKey } from '@/lib/idempotency'

export type ChatItem =
  | { kind: 'user'; id: string; text: string }
  | { kind: 'assistant'; id: string; stream: FloStreamState }

/**
 * One Flo chat: sends a question, reads the answer stream into `items`, and handles cancel, a dropped
 * stream (one GET /flo/conversations/:id to recover the persisted answer), New chat and opening an
 * old conversation. `done` replaces everything streamed with the persisted message.
 */
export function useFloChat(mode: FloMode) {
  const queryClient = useQueryClient()
  const [items, setItems] = useState<ChatItem[]>([])
  const [streaming, setStreaming] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [opening, setOpening] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const conversationId = useRef<string | null>(null)
  const controller = useRef<AbortController | null>(null)
  const busy = useRef(false)
  const counter = useRef(0)

  useEffect(() => {
    if (!streaming) return
    setElapsed(0)
    const timer = setInterval(() => setElapsed((seconds) => seconds + 1), 1000)
    return () => clearInterval(timer)
  }, [streaming])

  const setConversation = useCallback((id: string | null) => {
    conversationId.current = id
    setActiveId(id)
  }, [])

  const cancel = useCallback(() => controller.current?.abort(), [])

  const send = useCallback(
    async (raw: string) => {
      const question = raw.trim()
      if (!question || busy.current) return
      busy.current = true
      const abort = new AbortController()
      controller.current = abort
      counter.current += 1
      const id = `local-${counter.current}`
      setItems((previous) => [
        ...previous,
        { kind: 'user', id: `${id}-question`, text: question },
        { kind: 'assistant', id, stream: initialStream },
      ])
      setStreaming(true)
      setLoadError(null)

      let state = initialStream
      const show = (next: FloStreamState) => {
        state = next
        setItems((previous) =>
          previous.map((item) => (item.kind === 'assistant' && item.id === id ? { ...item, stream: next } : item)),
        )
      }

      /** The stream ended early: look the persisted answer up once, else show a retryable error. */
      async function recover() {
        if (abort.signal.aborted) {
          show(stopStream(state))
          return
        }
        if (state.conversationId && state.messageId) {
          try {
            const conversation = await floApi.conversation(state.conversationId)
            const message = conversation.messages.find((candidate) => candidate.id === state.messageId)
            if (message) {
              show(reduceStream(state, { type: 'done', message }))
              return
            }
          } catch {
            // fall through to the error below
          }
        }
        show(failStream(state, describeFloError('STREAM_DROPPED')))
      }

      try {
        const body = await apiStream('/flo/chat', {
          method: 'POST',
          body: JSON.stringify({ conversationId: conversationId.current ?? undefined, message: question, mode }),
          idempotencyKey: newIdempotencyKey(),
          signal: abort.signal,
        })
        let finished = false
        for await (const frame of readSseEvents(body)) {
          const parsed = parseFloEvent(frame)
          if (!parsed) continue
          const event = parsed.type === 'error' ? { ...parsed, error: errorFromEvent(parsed.error) } : parsed
          show(reduceStream(state, event))
          if (event.type === 'start') setConversation(event.conversationId)
          if (event.type === 'done' || event.type === 'declined' || event.type === 'error') finished = true
        }
        if (!finished) await recover()
      } catch (thrown) {
        if (state.messageId || abort.signal.aborted) await recover()
        else {
          const error = errorFromThrown(thrown)
          if (error.code === 'FLO_CONVERSATION_NOT_FOUND') setConversation(null)
          show(failStream(state, error))
        }
      } finally {
        busy.current = false
        setStreaming(false)
        void queryClient.invalidateQueries({ queryKey: floKeys.conversations })
        void queryClient.invalidateQueries({ queryKey: floKeys.status })
      }
    },
    [mode, queryClient, setConversation],
  )

  const newChat = useCallback(() => {
    cancel()
    setConversation(null)
    setItems([])
    setLoadError(null)
  }, [cancel, setConversation])

  /** Drops a failed answer and its question, then asks the same question again. */
  const retry = useCallback(
    (itemId: string) => {
      const index = items.findIndex((item) => item.id === itemId)
      const asked = items[index - 1]
      if (asked?.kind !== 'user' || busy.current) return
      setItems((previous) => previous.filter((_, position) => position !== index && position !== index - 1))
      void send(asked.text)
    },
    [items, send],
  )

  const openConversation = useCallback(
    async (id: string) => {
      cancel()
      setOpening(true)
      setLoadError(null)
      try {
        const conversation = await floApi.conversation(id)
        setItems(conversation.messages.map((message) => toItem(message, id)))
        setConversation(id)
      } catch {
        setLoadError(floContent.conversationError)
      } finally {
        setOpening(false)
      }
    },
    [cancel, setConversation],
  )

  return { items, streaming, elapsed, opening, loadError, activeId, send, cancel, newChat, retry, openConversation }
}

function toItem(message: FloMessage, conversationId: string): ChatItem {
  if (message.role === 'USER') return { kind: 'user', id: message.id, text: message.text ?? '' }
  return {
    kind: 'assistant',
    id: message.id,
    stream: { ...initialStream, conversationId, messageId: message.id, final: message, view: viewFromMessage(message) },
  }
}
