import { useState } from 'react'
import { ChatThreadView } from '@/components/chat/ChatThreadView'
import { chatContent } from '@/content/chat'
import { useChatThreads } from '@/features/chat/hooks/useChat'
import { errorMessage } from '@/lib/errors'
import { cn } from '@/lib/utils'

/** A technician's Conversation tab: the chat threads of the rounds they work, with unread counts. */
export function TechnicianChat({ technicianId }: { technicianId: string }) {
  const copy = chatContent
  const threadsQuery = useChatThreads()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const threads = (threadsQuery.data?.threads ?? []).filter((thread) =>
    thread.technicians.some((technician) => technician.id === technicianId),
  )
  const selected = threads.find((thread) => thread.roundId === selectedId) ?? threads[0]

  if (threadsQuery.isPending) return <p className="text-sm text-muted">{copy.threadsLoading}</p>
  if (threadsQuery.isError) {
    return (
      <p role="alert" className="text-sm text-danger">
        {errorMessage(threadsQuery.error)}
      </p>
    )
  }
  if (threads.length === 0 || !selected) {
    return <p className="rounded-xl border border-dashed border-border p-6 text-sm text-muted">{copy.noThreads}</p>
  }

  return (
    <div className="space-y-3">
      <div role="tablist" aria-label={copy.threadsTitle} className="flex flex-wrap gap-2">
        {threads.map((thread) => (
          <button
            key={thread.roundId}
            type="button"
            role="tab"
            aria-selected={thread.roundId === selected.roundId}
            onClick={() => setSelectedId(thread.roundId)}
            className={cn(
              'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
              thread.roundId === selected.roundId
                ? 'border-primary bg-primary/10 text-foreground'
                : 'border-border bg-card text-muted hover:bg-surface',
            )}
          >
            {thread.roundName}
            {thread.unreadCount > 0 ? (
              <span
                aria-label={copy.unread.replace('{count}', String(thread.unreadCount))}
                className="rounded-full bg-primary px-1.5 text-[11px] font-semibold text-primary-foreground"
              >
                {thread.unreadCount}
              </span>
            ) : null}
          </button>
        ))}
      </div>
      <ChatThreadView key={selected.roundId} roundId={selected.roundId} roundName={selected.roundName} />
    </div>
  )
}
