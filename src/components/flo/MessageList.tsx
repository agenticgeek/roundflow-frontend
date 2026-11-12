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
 * The conversation's own scroll region. It follows the answer only while the reader is at the bottom;
 * scrolling up pauses that and shows "Jump to latest".
 */
export function MessageList({ items, elapsed, busy, onAsk, onRetry }: MessageListProps) {
  const region = useRef<HTMLDivElement>(null)
  const following = useRef(true)
  const [atBottom, setAtBottom] = useState(true)

  function handleScroll() {
    const element = region.current as HTMLDivElement
    const near = element.scrollHeight - element.scrollTop - element.clientHeight <= BOTTOM_SLACK
    following.current = near
    setAtBottom(near)
  }

  function jumpToLatest() {
    const element = region.current as HTMLDivElement
    element.scrollTop = element.scrollHeight
    following.current = true
    setAtBottom(true)
  }

  useLayoutEffect(() => {
    const element = region.current as HTMLDivElement
    // A question just sent always brings the reader back to the bottom.
    if (items[items.length - 1]?.kind === 'user') following.current = true
    if (following.current) element.scrollTop = element.scrollHeight
  }, [items])

  return (
    <div className="relative min-h-0 flex-1">
      <div
        ref={region}
        role="region"
        aria-label={floContent.messages.label}
        tabIndex={0}
        onScroll={handleScroll}
        className="scrollbar-card h-full overflow-y-auto py-4 focus-visible:outline-none"
      >
        <div className="mx-auto max-w-[720px] space-y-6 px-1">
          {items.map((item) =>
            item.kind === 'user' ? (
              <UserBubble key={item.id} text={item.text} />
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
