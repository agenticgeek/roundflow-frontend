import { unassignedRoundsAlertContent as copy } from '@/content/round-planner'
import type { UnassignedRoundsAlert } from '@/features/rounds/hooks/useUnassignedRoundsAlert'
import { formatShortDate, parseIsoDate, todayIso } from '@/lib/round-dates'
import { cn, fillCopy } from '@/lib/utils'

interface UnassignedRoundsBannerProps {
  alert: UnassignedRoundsAlert
  canMutate: boolean
  onAssign: () => void
  /** Narrows the planner to that round (shown when only one round is affected). */
  onShowRound?: (roundId: string) => void
}

/** Whole days from today to `iso` (0 = today). */
function daysFromToday(iso: string): number {
  const date = parseIsoDate(iso)
  const today = parseIsoDate(todayIso())
  if (!date || !today) return Number.POSITIVE_INFINITY
  return Math.round((date.getTime() - today.getTime()) / 86_400_000)
}

function WarningIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className={className} aria-hidden="true">
      <path d="M10 3 2.5 16.5h15L10 3Z" strokeLinejoin="round" />
      <path d="M10 8.5v3.5M10 14.5v.01" strokeLinecap="round" />
    </svg>
  )
}

/**
 * Round Planner banner for active rounds with no technician and visits coming up. It names
 * the soonest round, since that's the one to fix first, and turns red when that round is
 * today or tomorrow, because those visits won't reach anyone's app.
 */
export function UnassignedRoundsBanner({ alert, canMutate, onAssign, onShowRound }: UnassignedRoundsBannerProps) {
  const [soonest] = alert.rounds
  if (!soonest) return null

  const daysAway = daysFromToday(soonest.nextDate)
  const urgent = daysAway <= 1
  const others = alert.rounds.length - 1
  const date = formatShortDate(soonest.nextDate)

  const title = urgent
    ? fillCopy(copy.urgentTitle, {
        round: soonest.roundName,
        when: daysAway <= 0 ? copy.today : copy.tomorrow,
      })
    : alert.totalVisits === 1
      ? copy.titleOne
      : fillCopy(copy.titleMany, { count: alert.totalVisits })

  const detail = urgent
    ? fillCopy(copy.urgentDetail, { count: soonest.nextVisits })
    : fillCopy(copy.roundLine, { round: soonest.roundName, date }) +
      (others > 0 ? fillCopy(others === 1 ? copy.moreRounds : copy.moreRoundsPlural, { count: others }) : '')

  return (
    <section
      role="status"
      aria-live="polite"
      className={cn(
        'flex animate-fade-in flex-col gap-3 rounded-2xl border-2 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5',
        urgent ? 'border-danger/45 bg-danger/5' : 'border-warning/60 bg-warning-surface',
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        <span
          className={cn(
            'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
            urgent ? 'bg-danger/10 text-danger' : 'bg-warning/15 text-warning-foreground',
          )}
        >
          <WarningIcon className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className={cn('text-sm font-semibold sm:text-[15px]', urgent ? 'text-danger' : 'text-warning-foreground')}>
            {title}
          </p>
          <p className="mt-0.5 text-sm text-foreground/80">
            {detail}
            {urgent ? null : <span className="text-muted"> · {copy.windowHint}</span>}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-3 sm:justify-end">
        {onShowRound && alert.rounds.length === 1 ? (
          <button
            type="button"
            onClick={() => onShowRound(soonest.roundId)}
            className="text-sm font-semibold text-foreground/80 underline-offset-2 transition-colors hover:text-foreground hover:underline"
          >
            {copy.showRound}
          </button>
        ) : null}
        {canMutate ? (
          <button
            type="button"
            onClick={onAssign}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none active:scale-[0.98]',
              urgent ? 'bg-danger focus-visible:ring-danger/40' : 'bg-warning-foreground focus-visible:ring-warning/50',
            )}
          >
            {copy.assign}
            <span aria-hidden="true">→</span>
          </button>
        ) : null}
      </div>
    </section>
  )
}
