import { assignResultContent as copy } from '@/content/round-planner'
import { outcomeLines, outcomeWarning, type AssignmentOutcome } from '@/features/rounds/lib/assignment-result'

/**
 * The visible result of saving technicians on rounds (FLOW-02): per round, how many visits were
 * updated and created, the next visit date, how many hand-assigned visits were left alone — and
 * a warning when nothing was updated or created. A polite live region, so screen-reader users
 * hear it when it appears.
 */
export function AssignmentResultSummary({ outcomes }: { outcomes: readonly AssignmentOutcome[] }) {
  if (outcomes.length === 0) return null
  return (
    <section role="status" aria-label={copy.title} className="w-full max-w-xl space-y-3 text-left">
      <h3 className="text-sm font-semibold text-foreground">{copy.title}</h3>
      <ul className="space-y-3">
        {outcomes.map((outcome) => {
          const warning = outcomeWarning(outcome)
          return (
            <li key={outcome.roundId} className="rounded-xl border border-border bg-background p-4">
              <p className="text-sm font-semibold text-foreground">{outcome.roundName}</p>
              {warning ? (
                <p className="mt-1.5 rounded-lg border border-warning-border bg-warning-surface px-3 py-2 text-sm text-warning-foreground">
                  {warning}
                </p>
              ) : null}
              <ul className="mt-1.5 space-y-0.5 text-sm text-muted">
                {outcomeLines(outcome).map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
