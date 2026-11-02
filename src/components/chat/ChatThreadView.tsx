import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Textarea } from '@/components/ui'
import { chatContent } from '@/content/chat'
import { useChatMessages, useMarkChatRead, useSendChatMessage } from '@/features/chat/hooks/useChat'
import { errorMessage } from '@/lib/errors'
import { cn } from '@/lib/utils'

const MAX_LENGTH = 2000

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

function newClientMsgId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

/** One round's chat: the messages (polled), the composer, and mark-read when opened or when new messages arrive. */
export function ChatThreadView({ roundId, roundName }: { roundId: string; roundName: string }) {
  const copy = chatContent
  const messagesQuery = useChatMessages(roundId)
  const send = useSendChatMessage(roundId)
  const markRead = useMarkChatRead()
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const messages = messagesQuery.data ?? []
  const latestIncoming = messages.filter((message) => !message.isMine).at(-1)?.id

  // Opening a thread, or a new message arriving while it is open, marks it read.
  const { mutate: markThreadRead } = markRead
  useEffect(() => {
    if (messagesQuery.isSuccess) markThreadRead(roundId)
  }, [roundId, messagesQuery.isSuccess, latestIncoming, markThreadRead])

  useEffect(() => {
    endRef.current?.scrollIntoView?.({ block: 'end' })
  }, [messages.length])

  async function submit(event: FormEvent) {
    event.preventDefault()
    const body = text.trim()
    if (!body || send.isPending) return
    if (body.length > MAX_LENGTH) return setError(copy.tooLong)
    setError(null)
    setText('')
    try {
      await send.mutateAsync({ text: body, clientMsgId: newClientMsgId() })
    } catch (caught) {
      setText(body)
      setError(errorMessage(caught))
    }
  }

  return (
    <section aria-label={roundName} className="flex min-h-[28rem] flex-col rounded-xl border border-border bg-card">
      <header className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground">{roundName}</h2>
      </header>
      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4" aria-live="polite">
        {messagesQuery.isPending ? (
          <p className="text-sm text-muted">{copy.loading}</p>
        ) : messagesQuery.isError ? (
          <p role="alert" className="text-sm text-danger">
            {errorMessage(messagesQuery.error)}
          </p>
        ) : messages.length === 0 ? (
          <p className="text-sm text-muted">{copy.empty}</p>
        ) : (
          messages.map((message) => (
            <article key={message.id} className={cn('flex flex-col', message.isMine ? 'items-end' : 'items-start')}>
              <div
                className={cn(
                  'max-w-md rounded-xl px-4 py-2.5 text-sm',
                  message.isMine ? 'bg-primary text-primary-foreground' : 'bg-muted/20 text-foreground',
                  message.id.startsWith('tmp-') && 'opacity-70',
                )}
              >
                {!message.isMine && message.senderName ? (
                  <p className="mb-0.5 text-[11px] font-semibold opacity-80">{message.senderName}</p>
                ) : null}
                {message.body ? <p className="whitespace-pre-wrap break-words">{message.body}</p> : null}
                {message.photoSignedUrls.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {message.photoSignedUrls.map((url) => (
                      <img key={url} src={url} alt={copy.photoAlt} className="h-24 w-28 rounded-lg object-cover" />
                    ))}
                  </div>
                ) : null}
                <time className={cn('mt-1 block text-[10px]', message.isMine ? 'text-primary-foreground/70' : 'text-muted')}>
                  {formatTime(message.createdAt)}
                </time>
              </div>
            </article>
          ))
        )}
        <div ref={endRef} />
      </div>
      <form onSubmit={(event) => void submit(event)} className="border-t border-border p-3">
        {error ? (
          <p role="alert" className="mb-2 text-xs text-danger">
            {error}
          </p>
        ) : null}
        <div className="flex items-end gap-2">
          <Textarea
            inputSize="sm"
            aria-label={copy.composerLabel}
            placeholder={copy.composerPlaceholder}
            value={text}
            rows={2}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) void submit(event)
            }}
          />
          <button
            type="submit"
            disabled={!text.trim() || send.isPending}
            className="shrink-0 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {copy.send}
          </button>
        </div>
      </form>
    </section>
  )
}
