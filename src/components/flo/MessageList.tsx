import { useLayoutEffect, useRef, useState } from 'react'
import { floContent } from '@/content/flo'
import { AssistantMessage } from '@/components/flo/AssistantMessage'
import { DashboardIcon } from '@/components/dashboard/DashboardIcon'
import { UserBubble } from '@/components/flo/UserBubble'
import type { ChatItem } from '@/features/flo/hooks/useFloChat'

/** How close to the bottom (px) still counts as "at the bottom". */
const BOTTOM_SLACK = 40

interface MessageListProps {
  items: readonly ChatItem[]
  elapsed: number
  busy: boolean
  onAsk: (question: string) => void
  onRetry: (itemId: string) => void
}

/**
 * The conversation's own scroll region. A question just sent is scrolled to the top, so the answer is read from its
 * start as it fills in below; the view does not chase the end of a streaming answer. Once the reader scrolls
 * themselves, it follows new content only while they are at the bottom, and "Jump to latest" appears when they are not.
 */
export function MessageList({ items, elapsed, busy, onAsk, onRetry }: MessageListProps) {
  const region = useRef<HTMLDivElement>(null)
  const following = useRef(true)
  /** True from sending a question until the reader scrolls by hand: the view stays on the question, not the bottom. */
  const anchored = useRef(false)
  /** The newest question already handled, so each one is anchored once (and an opened history is not). */
  const handledQuestion = useRef<string | null>(null)
  const [atBottom, setAtBottom] = useState(true)

  function handleScroll() {
    const element = region.current as HTMLDivElement
    const near = element.scrollHeight - element.scrollTop - element.clientHeight <= BOTTOM_SLACK
    if (!anchored.current) following.current = near
    setAtBottom(near)
  }

  /** A deliberate scroll by the reader (wheel, touch, keys, scrollbar drag) hands control back to normal following. */
  function releaseAnchor() {
    anchored.current = false
  }

  function jumpToLatest() {
    const element = region.current as HTMLDivElement
    element.scrollTop = element.scrollHeight
    anchored.current = false
    following.current = true
    setAtBottom(true)
  }

  useLayoutEffect(() => {
    const element = region.current as HTMLDivElement
    const lastUser = [...items].reverse().find((item) => item.kind === 'user')
    const last = items[items.length - 1]
    // A question just asked: its answer is on the way (or not yet created). An opened past conversation is complete.
    const justAsked = last?.kind === 'user' || (last?.kind === 'assistant' && last.stream.view.streaming)
    const isNewQuestion = lastUser !== undefined && lastUser.id !== handledQuestion.current
    if (lastUser) handledQuestion.current = lastUser.id
    if (isNewQuestion && justAsked) {
      // A question was just sent: put it at the top so the answer is read from its start.
      anchored.current = true
      const bubbles = element.querySelectorAll<HTMLElement>('[data-user-item]')
      const latest = bubbles[bubbles.length - 1]
      if (latest) {
        element.scrollTop += latest.getBoundingClientRect().top - element.getBoundingClientRect().top - 16
      }
    } else if (following.current && !anchored.current) {
      element.scrollTop = element.scrollHeight
    }
  }, [items])

  return (
    <div className="relative min-h-0 flex-1">
      <div
        ref={region}
        role="region"
        aria-label={floContent.messages.label}
        tabIndex={0}
        onScroll={handleScroll}
        onWheel={releaseAnchor}
        onTouchStart={releaseAnchor}
        onPointerDown={releaseAnchor}
        onKeyDown={releaseAnchor}
        className="scrollbar-card h-full overflow-y-auto py-4 focus-visible:outline-none"
      >
        <div className="mx-auto max-w-[720px] space-y-6 px-1">
          {items.map((item) =>
            item.kind === 'user' ? (
              <div key={item.id} data-user-item>
                <UserBubble text={item.text} />
              </div>
            ) : (
              <AssistantMessage
                key={item.id}
                view={item.stream.view}
                elapsed={elapsed}
                busy={busy}
                onAsk={onAsk}
                onRetry={() => onRetry(item.id)}
              />
            ),
          )}
        </div>
      </div>
      {atBottom ? null : (
        <button
          type="button"
          onClick={jumpToLatest}
          className="absolute bottom-3 left-1/2 inline-flex min-h-8 -translate-x-1/2 animate-fade-in items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-1 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-accent-surface"
        >
          <DashboardIcon name="chevron-down" className="h-4 w-4" />
          {floContent.scrollToLatest}
        </button>
      )}
    </div>
  )
}
