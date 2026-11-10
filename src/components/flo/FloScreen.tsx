import { useEffect, useRef, useState } from 'react'
import { floContent } from '@/content/flo'
import { Composer } from '@/components/flo/Composer'
import { ConversationDrawer } from '@/components/flo/ConversationDrawer'
import { MessageList } from '@/components/flo/MessageList'
import { ModeSwitch } from '@/components/flo/ModeSwitch'
import { SuggestionGrid } from '@/components/flo/SuggestionGrid'
import { useFloChat, type ChatItem } from '@/features/flo/hooks/useFloChat'
import { useFloMode } from '@/features/flo/hooks/useFloMode'
import { useFloStatus, useFloSuggestions } from '@/features/flo/hooks/useFloStatus'
import { statusLine } from '@/features/flo/lib/format'
import { fillCopy } from '@/lib/utils'

/**
 * What a screen reader hears. While streaming: only the status line ("Checking: debt"), which changes a
 * few times per answer. When finished: the intro, or the decline / error, once. Sentence typing is never read out.
 */
function announcement(last: ChatItem | undefined): string {
  if (last?.kind !== 'assistant') return ''
  const { view } = last.stream
  if (view.streaming) return statusLine(view.statuses)
  if (view.declined) return view.declined.text
  if (view.error) return view.error.message
  if (view.stopped) return floContent.stopped
  if (view.malformed) return floContent.malformed
  return view.intro.map((sentence) => sentence.text).join(' ')
}

/** The Flo AI page: header, answer style, conversation, composer, history drawer. */
export function FloScreen() {
  const status = useFloStatus()
  const enabled = status.data?.enabled !== false
  const suggestions = useFloSuggestions(enabled)
  const [mode, setMode] = useFloMode()
  const chat = useFloChat(mode)
  const [historyOpen, setHistoryOpen] = useState(false)
  const composer = useRef<HTMLTextAreaElement>(null)
  const wasStreaming = useRef(false)

  // When an answer ends, focus goes back to the question box.
  useEffect(() => {
    if (wasStreaming.current && !chat.streaming) composer.current?.focus()
    wasStreaming.current = chat.streaming
  }, [chat.streaming])

  const remaining = status.data?.dailyRemaining
  const modes = status.data?.modes ?? floContent.mode.fallbackModes

  return (
    <div className="flex h-[calc(100svh-9rem)] min-h-[28rem] flex-col gap-3">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold text-foreground">{floContent.title}</h1>
          <p className="max-w-2xl text-sm text-muted">{floContent.subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setHistoryOpen(true)}
            className="min-h-8 rounded-lg border border-border bg-background px-3 text-sm text-foreground hover:bg-accent-surface"
          >
            {floContent.history}
          </button>
          <button
            type="button"
            onClick={chat.newChat}
            className="min-h-8 rounded-lg border border-border bg-background px-3 text-sm text-foreground hover:bg-accent-surface"
          >
            {floContent.newChat}
          </button>
        </div>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <ModeSwitch modes={modes} value={mode} disabled={chat.streaming} onChange={setMode} />
        {remaining === undefined ? null : (
          <p className="text-xs text-muted">
            {remaining === 1 ? floContent.remainingOne : fillCopy(floContent.remaining, { count: remaining })}
          </p>
        )}
      </div>

      {enabled ? null : <p role="alert" className="text-sm text-danger">{floContent.disabled}</p>}
      {status.isError ? <p className="text-sm text-muted">{floContent.statusError}</p> : null}
      {chat.loadError ? <p role="alert" className="text-sm text-danger">{chat.loadError}</p> : null}
      {chat.opening ? <p className="text-sm text-muted">{floContent.loadingConversation}</p> : null}

      {chat.items.length === 0 ? (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <SuggestionGrid
            groups={suggestions.data?.groups ?? []}
            loading={suggestions.isPending && enabled}
            disabled={chat.streaming || !enabled}
            onAsk={(question) => void chat.send(question)}
          />
        </div>
      ) : (
        <MessageList
          items={chat.items}
          elapsed={chat.elapsed}
          busy={chat.streaming}
          onAsk={(question) => void chat.send(question)}
          onRetry={chat.retry}
        />
      )}

      <div role="status" aria-live="polite" className="sr-only">
        {announcement(chat.items[chat.items.length - 1])}
      </div>

      <Composer
        streaming={chat.streaming}
        disabled={!enabled}
        onSend={(text) => void chat.send(text)}
        onStop={chat.cancel}
        inputRef={composer}
      />

      <ConversationDrawer
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        activeId={chat.activeId}
        onOpen={(id) => void chat.openConversation(id)}
        onDeleted={(id) => {
          if (id === chat.activeId) chat.newChat()
        }}
      />
    </div>
  )
}
