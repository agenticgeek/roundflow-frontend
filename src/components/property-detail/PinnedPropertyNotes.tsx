import { propertyDetailContent } from '@/content/property-detail'
import { DashboardIcon } from '@/components/dashboard/DashboardIcon'
import type { PinnedEntry } from '@/features/properties/lib/notes'
import { cn } from '@/lib/utils'

/**
 * The property's access and risk notes, pinned above the note history on the Notes & Risk tab
 * (GAP-022). They come first in GET /properties/:id/notes as `{ pinned, source, body }`; risk
 * is shown first so technicians' warnings can't be missed.
 */
export function PinnedPropertyNotes({ pinned }: { pinned: readonly PinnedEntry[] }) {
  const copy = propertyDetailContent.notesRisk.pinned
  const cards = [...pinned.filter((entry) => entry.source === 'RISK'), ...pinned.filter((entry) => entry.source === 'ACCESS')]

  if (cards.length === 0) return null

  return (
    <div className="mt-5 space-y-3">
      {cards.map((card) => {
        const risk = card.source === 'RISK'
        return (
          <article
            key={card.source}
            className={cn('rounded-lg border p-4', risk ? 'border-danger/40 bg-danger/5' : 'border-primary/30 bg-accent-surface')}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
                <DashboardIcon name={risk ? 'alert-circle' : 'info'} className="h-4 w-4" />
                {risk ? copy.risk : copy.access}
              </h3>
              <span className="rounded-md bg-card px-2 py-0.5 text-[11px] font-semibold text-muted">{copy.badge}</span>
            </div>
            <p className="mt-2 text-sm whitespace-pre-line text-foreground">{card.body}</p>
            <p className="mt-2 text-xs text-muted">{copy.source}</p>
          </article>
        )
      })}
    </div>
  )
}
