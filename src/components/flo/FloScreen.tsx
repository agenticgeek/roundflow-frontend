import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { floContent } from '@/content/flo'
import { DashboardIcon } from '@/components/dashboard/DashboardIcon'
import { Composer } from '@/components/flo/Composer'
import { ConversationDrawer } from '@/components/flo/ConversationDrawer'
import { FloMark } from '@/components/flo/FloMark'
import { FloWelcome } from '@/components/flo/FloWelcome'
import { FOCUS_RING } from '@/components/flo/flo-styles'
import { MessageList } from '@/components/flo/MessageList'
import { ModeSwitch } from '@/components/flo/ModeSwitch'
import { SuggestionGrid } from '@/components/flo/SuggestionGrid'
import { useFloChat, type ChatItem } from '@/features/flo/hooks/useFloChat'
import { useFloMode } from '@/features/flo/hooks/useFloMode'
import { useFloStatus, useFloSuggestions } from '@/features/flo/hooks/useFloStatus'
import { statusLine } from '@/features/flo/lib/format'
import { cn, fillCopy } from '@/lib/utils'

const NEW_CHAT_BUTTON = `inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm transition-[background-color,transform] duration-150 hover:bg-primary-hover active:scale-[0.98] ${FOCUS_RING}`
const NOTICE = 'mt-4 flex items-center gap-2 rounded-xl border border-danger/20 bg-card px-4 py-2 text-[15px] text-danger'

/** How the question box glides from the middle of the page to the bottom when a conversation starts. */
const DOCK_MOTION: KeyframeAnimationOptions = { duration: 550, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' }

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

/**
 * The Flo AI page. Before a conversation: a greeting, the question box in the middle, area tags and
 * suggestions. Once it starts, the same box glides down to the bottom under the conversation.
 */
export function FloScreen() {
  const status = useFloStatus()
  const enabled = status.data?.enabled !== false
  const suggestions = useFloSuggestions(enabled)
  const [mode, setMode] = useFloMode()
  const chat = useFloChat(mode)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [draft, setDraft] = useState<{ text: string; id: number }>()
  const composer = useRef<HTMLTextAreaElement>(null)
  const dock = useRef<HTMLDivElement>(null)
  const dockTop = useRef<number | null>(null)
  const wasStreaming = useRef(false)
  const started = chat.items.length > 0

  // When an answer ends, focus goes back to the question box.
  useEffect(() => {
    if (wasStreaming.current && !chat.streaming) composer.current?.focus()
    wasStreaming.current = chat.streaming
  }, [chat.streaming])

  // The box keeps its DOM node across the layout change, so animate it from where it was to where it is.
  useLayoutEffect(() => {
    const element = dock.current
    if (!element) return
    const top = element.getBoundingClientRect().top
    const from = dockTop.current
    dockTop.current = top
    const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (from === null || from === top || still || typeof element.animate !== 'function') return
    element.animate([{ transform: `translateY(${from - top}px)` }, { transform: 'translateY(0)' }], DOCK_MOTION)
  }, [started])

  function startQuestion(text: string) {
    setDraft((current) => ({ text, id: (current?.id ?? 0) + 1 }))
    requestAnimationFrame(() => {
      const box = composer.current
      box?.focus()
      box?.setSelectionRange(text.length, text.length)
    })
  }

  const remaining = status.data?.dailyRemaining
  const modes = status.data?.modes ?? floContent.mode.fallbackModes

  return (
    <div className="flex h-[calc(100svh-9rem)] min-h-[34rem] flex-col">
      <header className="relative flex flex-col items-center gap-4 border-b border-hairline pb-4 text-center">
        <div className="flex items-center gap-3">
          <FloMark size="lg" live={chat.streaming} />
          <h1 className="font-display text-[32px] leading-none font-semibold tracking-[-0.02em] whitespace-nowrap text-foreground">
            {floContent.wordmark.name} <span className="text-accent">{floContent.wordmark.suffix}</span>
          </h1>
        </div>
        <div className="order-first flex items-center gap-2 self-end sm:absolute sm:top-0 sm:right-0">
          <button
            type="button"
            onClick={chat.newChat}
            aria-label={floContent.newChat}
            title={floContent.newChat}
            className={NEW_CHAT_BUTTON}
          >
            <DashboardIcon name="plus" className="h-[18px] w-[18px]" />
          </button>
        </div>
      </header>

      {enabled ? null : (
        <p role="alert" className={NOTICE}>
          <DashboardIcon name="alert-circle" className="h-4 w-4 shrink-0" />
          {floContent.disabled}
        </p>
      )}
      {chat.loadError ? (
        <p role="alert" className={NOTICE}>
          <DashboardIcon name="alert-circle" className="h-4 w-4 shrink-0" />
          {chat.loadError}
        </p>
      ) : null}
      {chat.opening ? <p className="mt-4 text-[13px] text-muted-strong">{floContent.loadingConversation}</p> : null}

      <div className="flex min-h-0 flex-1 flex-col">
        {started ? (
          <MessageList
            items={chat.items}
            elapsed={chat.elapsed}
            busy={chat.streaming}
            onAsk={(question) => void chat.send(question)}
            onRetry={chat.retry}
          />
        ) : (
          <div className="pt-20 pb-6">
            <FloWelcome />
          </div>
        )}

        <div ref={dock} className={cn('relative z-10 mx-auto w-full max-w-[720px]', started && 'pt-2')}>
          <div className="mb-4 flex justify-center">
            <ModeSwitch modes={modes} value={mode} disabled={chat.streaming} onChange={setMode} />
          </div>
          <Composer
            streaming={chat.streaming}
            disabled={!enabled}
            onSend={(text) => void chat.send(text)}
            onStop={chat.cancel}
            inputRef={composer}
            draft={draft}
            onHistory={() => setHistoryOpen(true)}
          />
          <div className="mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-2 text-[13px] text-muted-strong">
            <span className="inline-flex items-center gap-2">
              <DashboardIcon name="shield" className="h-4 w-4" />
              {floContent.readOnly}
            </span>
            <div role="status" className="inline-flex items-center gap-2">
              {status.isError ? (
                <>
                  <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-warning" />
                  <span>{floContent.statusError}</span>
                  <button
                    type="button"
                    aria-label={floContent.statusRetryLabel}
                    disabled={status.isFetching}
                    onClick={() => void status.refetch()}
                    className={`rounded font-medium text-accent underline-offset-4 hover:underline disabled:opacity-50 ${FOCUS_RING}`}
                  >
                    {floContent.statusRetry}
                  </button>
                </>
              ) : remaining === undefined ? null : (
                <>
                  <span aria-hidden="true" className={cn('h-1.5 w-1.5 rounded-full', remaining > 0 ? 'bg-success' : 'bg-danger')} />
                  {remaining === 1 ? floContent.remainingOne : fillCopy(floContent.remaining, { count: remaining })}
                </>
              )}
            </div>
          </div>
        </div>

        {started ? null : (
          <div className="scrollbar-card min-h-0 flex-1 overflow-y-auto pt-12 pb-2">
            <SuggestionGrid
              groups={suggestions.data?.groups ?? []}
              loading={suggestions.isPending && enabled}
              disabled={chat.streaming || !enabled}
              onAsk={(question) => void chat.send(question)}
              onPick={startQuestion}
            />
          </div>
        )}
      </div>

      <div id="flo-announcer" role="status" aria-live="polite" className="sr-only">
        {announcement(chat.items[chat.items.length - 1])}
      </div>

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
