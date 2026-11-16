import { closuresContent } from '@/content/closures'
import type { ClosureWarning as ClosureWarningData, IsoDate } from '@/features/closures/types'
import { formatShortDate } from '@/lib/round-dates'
import { fillCopy } from '@/lib/utils'

/** A closure as far as the warning needs it. A full `Closure` fits; the carryover marker has no dates. */
export interface ClosureWarningRef {
  id?: string
  label: string
  startDate?: IsoDate
  endDate?: IsoDate
}

const copy = closuresContent

function lineFor(ref: ClosureWarningRef): string {
  if (!ref.startDate || !ref.endDate) return fillCopy(copy.planner.banner, { label: ref.label })
  return fillCopy(copy.warning.text, {
    label: ref.label,
    start: formatShortDate(ref.startDate, true),
    end: formatShortDate(ref.endDate, true),
  })
}

/**
 * Non-blocking notice that a chosen date falls inside a business closure (rules s7). It announces itself
 * (`role="status"`) and never disables anything: the caller keeps its submit button enabled. Feed it the
 * `warnings` from a response and/or the `closure` found locally with `closureForDate`.
 */
export function ClosureWarning({
  warnings,
  closure,
}: {
  warnings?: readonly ClosureWarningData[]
  closure?: ClosureWarningRef | null
}) {
  const refs: ClosureWarningRef[] = (warnings ?? []).map((warning) => ({ ...warning, id: warning.closureId }))
  if (closure && !refs.some((ref) => ref.id === closure.id)) refs.push(closure)
  if (refs.length === 0) return null
  return (
    <div role="status" className="mt-2 rounded-lg border border-warning-border bg-warning-surface px-3 py-2 text-sm text-warning-foreground">
      {refs.map((ref, index) => (
        <p key={ref.id ?? `${ref.label}-${index}`}>{lineFor(ref)}</p>
      ))}
      <p className="mt-1 text-xs">{copy.warning.hint}</p>
    </div>
  )
}
