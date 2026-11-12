import { floContent } from '@/content/flo'
import { CardsBlock } from '@/components/flo/CardsBlock'
import { DashboardIcon } from '@/components/dashboard/DashboardIcon'
import { DeclinedNotice } from '@/components/flo/DeclinedNotice'
import { FloMark } from '@/components/flo/FloMark'
import { FollowUps } from '@/components/flo/FollowUps'
import { InsightsBlock } from '@/components/flo/InsightsBlock'
import { Sentence } from '@/components/flo/Sentence'
import { SourcesPill } from '@/components/flo/SourcesPill'
import { TableBlock } from '@/components/flo/TableBlock'
import { UnverifiedNotice } from '@/components/flo/UnverifiedNotice'
import { WorkingIndicator } from '@/components/flo/WorkingIndicator'
import { isCardsBlock, isTableBlock } from '@/features/flo/lib/blocks'
import type { AssistantView } from '@/features/flo/lib/stream-reducer'

interface AssistantMessageProps {
  view: AssistantView
  /** Seconds since the question was sent; only shown while streaming. */
  elapsed: number
  /** Questions cannot be sent while an answer is streaming. */
  busy: boolean
  onAsk: (question: string) => void
  onRetry: () => void
}

/**
 * Flo's answer, from live status line to finished message. Everything is plain text (React escapes it);
 * blocks fade in whole, sentences type in. The article is not a live region, so typing is never read out.
 */
export function AssistantMessage({ view, elapsed, busy, onAsk, onRetry }: AssistantMessageProps) {
  const failed = view.error !== null || view.malformed
  const retryable = view.malformed || view.error?.retryable === true
  return (
    <article aria-label={floContent.messages.flo} className="flex max-w-3xl animate-fade-in gap-3">
      <FloMark size="sm" live={view.streaming} className="mt-0.5" />
      <div className="min-w-0 flex-1 space-y-4">
        {view.streaming ? <WorkingIndicator statuses={view.statuses} elapsed={elapsed} /> : null}

        {view.intro.length > 0 ? (
          <p className="text-sm leading-relaxed text-foreground">
            {view.intro.map((sentence, index) => (
              <span key={index}>
                {index > 0 ? ' ' : ''}
                <Sentence sentence={sentence} animate={view.streaming} />
              </span>
            ))}
          </p>
        ) : null}

        {view.blocks.map((block, index) => {
          const content = isCardsBlock(block) ? <CardsBlock block={block} /> : isTableBlock(block) ? <TableBlock block={block} /> : null
          return content ? (
            <div key={index} className="animate-fade-in motion-reduce:animate-none">
              {content}
            </div>
          ) : null
        })}

        {view.insights.length > 0 ? <InsightsBlock insights={view.insights} animate={view.streaming} /> : null}
        {view.truncated ? <p className="text-xs text-muted">{floContent.truncated}</p> : null}
        {view.warnings.includes('UNVERIFIED_FIGURES') ? <UnverifiedNotice /> : null}
        {view.declined ? <DeclinedNotice declined={view.declined} onAsk={onAsk} disabled={busy} /> : null}
        {!view.streaming && view.sources.length > 0 ? <SourcesPill sources={view.sources} dateRange={view.dateRange} /> : null}
        {!view.streaming && view.followUps.length > 0 ? <FollowUps items={view.followUps} disabled={busy} onAsk={onAsk} /> : null}
        {view.stopped ? (
          <p className="inline-flex items-center gap-1.5 text-sm text-muted">
            <DashboardIcon name="pause" className="h-4 w-4" />
            {floContent.stopped}
          </p>
        ) : null}

        {failed ? (
          <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl border border-danger/20 bg-card px-3.5 py-2.5 text-sm text-danger">
            <DashboardIcon name="alert-circle" className="h-4 w-4 shrink-0" />
            <span className="min-w-0 flex-1">{view.malformed ? floContent.malformed : view.error?.message}</span>
            {retryable ? (
              <button
                type="button"
                disabled={busy}
                onClick={onRetry}
                className="inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1 font-medium text-foreground transition-colors hover:bg-accent-surface disabled:opacity-50"
              >
                <DashboardIcon name="refresh" className="h-3.5 w-3.5" />
                {floContent.retry}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  )
}
