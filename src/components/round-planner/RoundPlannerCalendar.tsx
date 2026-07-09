import type { RoundPlannerDay, RoundPlannerRound, RoundPlannerWeek } from '@/content/round-planner'
import type { RoundPlannerDayOfWeek } from '@/content/round-planner'
import { PanelCard } from '@/components/dashboard/DashboardControls'
import { cn } from '@/lib/utils'

interface RoundPlannerCalendarProps {
  weeks: readonly RoundPlannerWeek[]
  days: RoundPlannerDay[]
  dayHeaders: readonly RoundPlannerDayOfWeek[]
  emptyLabel: string
  onSelectRound: (roundId: string) => void
}

/** Mon–Fri grid — one row group per week in the cycle. */
export function RoundPlannerCalendar({
  weeks,
  days,
  dayHeaders,
  emptyLabel,
  onSelectRound,
}: RoundPlannerCalendarProps) {
  return (
    <PanelCard interactive={false} className="overflow-hidden p-0">
      <div className="overflow-x-auto">
        <div className="min-w-[40rem]">
          <div className="grid grid-cols-5 border-b border-border bg-surface/80">
            {dayHeaders.map((day) => (
              <div
                key={day}
                className="border-r border-border px-3 py-2.5 text-center text-xs font-semibold text-foreground last:border-r-0"
              >
                {day}
              </div>
            ))}
          </div>

          {weeks.map((week) => {
            const weekDays = dayHeaders.map((dayOfWeek) =>
              days.find((day) => day.weekId === week.id && day.dayOfWeek === dayOfWeek),
            )

            return (
              <div key={week.id} className="grid grid-cols-5 border-b border-border last:border-b-0">
                {weekDays.map((day) => (
                  <CalendarCell
                    key={day?.id ?? `${week.id}-empty`}
                    day={day}
                    emptyLabel={emptyLabel}
                    onSelectRound={onSelectRound}
                  />
                ))}
              </div>
            )
          })}
        </div>
      </div>
    </PanelCard>
  )
}

function CalendarCell({
  day,
  emptyLabel,
  onSelectRound,
}: {
  day?: RoundPlannerDay
  emptyLabel: string
  onSelectRound: (roundId: string) => void
}) {
  if (!day) {
    return <div className="min-h-[7rem] border-r border-border bg-background last:border-r-0" />
  }

  return (
    <div className="min-h-[7rem] border-r border-border bg-background p-2.5 last:border-r-0">
      <p className="text-xs font-semibold text-foreground">{day.dateLabel}</p>

      {day.rounds.length === 0 ? (
        <p className="mt-3 text-xs text-muted">{emptyLabel}</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {day.rounds.map((round) => (
            <RoundCard key={round.id} round={round} onSelect={() => onSelectRound(round.id)} />
          ))}
        </ul>
      )}
    </div>
  )
}

function RoundCard({ round, onSelect }: { round: RoundPlannerRound; onSelect: () => void }) {
  const statusDotClass =
    round.status === 'completed'
      ? 'bg-success'
      : round.status === 'in-progress'
        ? 'bg-primary'
        : 'bg-muted'

  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        className={cn(
          'w-full rounded-lg border border-accent/20 bg-accent-surface px-2.5 py-2 text-left',
          'transition-colors duration-150 hover:border-accent/40 hover:bg-accent-surface/80',
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs font-semibold text-foreground">{round.title}</p>
          <span className={cn('mt-1 h-1.5 w-1.5 shrink-0 rounded-full', statusDotClass)} />
        </div>
        <p className="mt-1 text-[11px] text-muted">
          {round.stops} stops · {round.value}
        </p>
        <p className="mt-1 text-[11px] font-medium text-accent">
          {round.technician} · {round.statusLabel}
        </p>
      </button>
    </li>
  )
}
