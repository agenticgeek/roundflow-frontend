import { plannerDayStatusLabels } from '@/content/round-planner'
import type { PlannerRoundCard, PlannerWeekRow } from '@/features/rounds/lib/planner'
import { formatShortDate } from '@/features/rounds/lib/planner'
import { PanelCard } from '@/components/dashboard/DashboardControls'
import { Skeleton } from '@/components/ui/skeleton'
import { cn, formatCurrency } from '@/lib/utils'

interface RoundPlannerCalendarProps {
  weeks: readonly PlannerWeekRow[]
  cardsByDate: ReadonlyMap<string, PlannerRoundCard[]>
  dayHeaders: readonly string[]
  emptyLabel: string
  stopsLabel: string
  unassignedLabel: string
  today: string
  currency: string
  loading: boolean
  onSelectCard: (card: PlannerRoundCard) => void
  /** Shown on cards with no technician; omit to hide the action (e.g. read-only users). */
  onAssignCard?: (card: PlannerRoundCard) => void
  assignLabel: string
}

/** Mon–Sun grid — one row per week in the window, cells looked up by date. */
export function RoundPlannerCalendar({
  weeks,
  cardsByDate,
  dayHeaders,
  emptyLabel,
  stopsLabel,
  unassignedLabel,
  today,
  currency,
  loading,
  onSelectCard,
  onAssignCard,
  assignLabel,
}: RoundPlannerCalendarProps) {
  return (
    <PanelCard interactive={false} className="overflow-hidden p-0">
      <div className="overflow-x-auto">
        <div className="min-w-[56rem]">
          <div className="grid grid-cols-7 border-b border-border bg-surface/80">
            {dayHeaders.map((day) => (
              <div
                key={day}
                className="border-r border-border px-3 py-2.5 text-center text-xs font-semibold text-foreground last:border-r-0"
              >
                {day}
              </div>
            ))}
          </div>

          {weeks.map((week) => (
            <div key={week.id} className="grid grid-cols-7 border-b border-border last:border-b-0">
              {week.dates.map((date) => (
                <CalendarCell
                  key={date}
                  date={date}
                  cards={cardsByDate.get(date) ?? []}
                  isToday={date === today}
                  emptyLabel={emptyLabel}
                  stopsLabel={stopsLabel}
                  unassignedLabel={unassignedLabel}
                  currency={currency}
                  loading={loading}
                  onSelectCard={onSelectCard}
                  onAssignCard={onAssignCard}
                  assignLabel={assignLabel}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </PanelCard>
  )
}

function CalendarCell({
  date,
  cards,
  isToday,
  emptyLabel,
  stopsLabel,
  unassignedLabel,
  currency,
  loading,
  onSelectCard,
  onAssignCard,
  assignLabel,
}: {
  date: string
  cards: PlannerRoundCard[]
  isToday: boolean
  emptyLabel: string
  stopsLabel: string
  unassignedLabel: string
  currency: string
  loading: boolean
  onSelectCard: (card: PlannerRoundCard) => void
  onAssignCard?: (card: PlannerRoundCard) => void
  assignLabel: string
}) {
  return (
    <div
      className={cn(
        'min-h-[7rem] border-r border-border bg-background p-2.5 last:border-r-0',
        isToday && 'bg-accent-surface/40',
      )}
    >
      <p
        className={cn(
          'text-xs font-semibold text-foreground',
          isToday && 'inline-flex rounded-md bg-primary px-1.5 py-0.5 text-primary-foreground',
        )}
      >
        {formatShortDate(date)}
      </p>

      {loading ? (
        <div className="mt-3 space-y-2">
          <Skeleton className="h-3 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      ) : cards.length === 0 ? (
        <p className="mt-3 text-xs text-muted">{emptyLabel}</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {cards.map((card) => (
            <RoundCard
              key={card.key}
              card={card}
              stopsLabel={stopsLabel}
              unassignedLabel={unassignedLabel}
              currency={currency}
              onSelect={() => onSelectCard(card)}
              onAssign={onAssignCard ? () => onAssignCard(card) : undefined}
              assignLabel={assignLabel}
            />
          ))}
        </ul>
      )}
    </div>
  )
}

const statusDotClass: Record<PlannerRoundCard['status'], string> = {
  completed: 'bg-success',
  in_progress: 'bg-primary',
  not_started: 'bg-muted',
}

function RoundCard({
  card,
  stopsLabel,
  unassignedLabel,
  currency,
  onSelect,
  onAssign,
  assignLabel,
}: {
  card: PlannerRoundCard
  stopsLabel: string
  unassignedLabel: string
  currency: string
  onSelect: () => void
  onAssign?: () => void
  assignLabel: string
}) {
  const unassigned = !card.technicianName
  // Finished days don't need anyone any more.
  const canAssign = unassigned && card.status !== 'completed' && Boolean(onAssign)

  return (
    <li
      className={cn(
        'overflow-hidden rounded-lg border transition-colors duration-150',
        canAssign
          ? 'border-warning/50 bg-warning-surface hover:border-warning'
          : 'border-accent/20 bg-accent-surface hover:border-accent/40',
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        className={cn(
          'w-full px-2.5 py-2 text-left transition-colors duration-150',
          canAssign ? 'hover:bg-warning-surface/70' : 'hover:bg-accent-surface/80',
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs font-semibold text-foreground">{card.roundName}</p>
          <span className={cn('mt-1 h-1.5 w-1.5 shrink-0 rounded-full', statusDotClass[card.status])} />
        </div>
        <p className="mt-1 text-[11px] text-muted">
          {card.stopCount} {stopsLabel} · {formatCurrency(card.totalValue, currency)}
        </p>
        <p className={cn('mt-1 text-[11px] font-medium', canAssign ? 'text-warning-foreground' : 'text-accent')}>
          {card.technicianName ?? unassignedLabel} · {plannerDayStatusLabels[card.status]}
        </p>
        {card.holdCount > 0 || card.issueCount > 0 ? (
          <p className="mt-1 flex flex-wrap gap-1.5 text-[10px] font-medium">
            {card.holdCount > 0 ? (
              <span className="rounded bg-warning-surface px-1.5 py-0.5 text-warning">{card.holdCount} hold</span>
            ) : null}
            {card.issueCount > 0 ? (
              <span className="rounded bg-danger/10 px-1.5 py-0.5 text-danger">{card.issueCount} issue</span>
            ) : null}
          </p>
        ) : null}
      </button>

      {canAssign ? (
        <button
          type="button"
          onClick={onAssign}
          className="flex w-full items-center justify-center gap-1 border-t border-warning/30 bg-card/70 px-2.5 py-1.5 text-[11px] font-semibold text-warning-foreground transition-colors duration-150 hover:bg-card"
        >
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" className="h-3 w-3" aria-hidden="true">
            <path d="M8 3.5v9M3.5 8h9" strokeLinecap="round" />
          </svg>
          {assignLabel}
        </button>
      ) : null}
    </li>
  )
}
