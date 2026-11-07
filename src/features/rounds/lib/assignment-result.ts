import type { SetTechniciansResult } from '@/api/rounds.api'
import { assignResultContent as copy } from '@/content/round-planner'
import { formatShortDate } from '@/lib/round-dates'
import { fillCopy } from '@/lib/utils'

/** What saving a round's technicians did to its visits (FLOW-01 / FLOW-02 / FLOW-04). */
export interface AssignmentOutcome {
  roundId: string
  roundName: string
  visitsUpdated: number
  visitsGenerated: number
  /** Visits an office user assigned by hand: left alone, not re-stamped. */
  overriddenVisits: number
  /** The day the round's next visit falls on (`YYYY-MM-DD`), when the server knows it. */
  nextVisitDate: string | null
}

/** Reads the `PUT /rounds/:id/technicians` response. The spec marks the new fields required; an older backend still omits them. */
export function toAssignmentOutcome(round: { id: string; name: string }, result: SetTechniciansResult): AssignmentOutcome {
  return {
    roundId: round.id,
    roundName: round.name,
    visitsUpdated: result.visitsUpdated,
    visitsGenerated: result.visitsGenerated ?? 0,
    overriddenVisits: result.overriddenVisits ?? 0,
    nextVisitDate: result.nextVisitDate ?? null,
  }
}

function plural(count: number, one: string, many: string): string {
  return fillCopy(count === 1 ? one : many, { count })
}

function dateLabel(iso: string): string {
  return formatShortDate(iso.slice(0, 10), true)
}

/** True when nothing was updated or generated: the technician's app has nothing new to show. */
export function hasNoVisits(outcome: AssignmentOutcome): boolean {
  return outcome.visitsUpdated + outcome.visitsGenerated === 0
}

/** The clear warning for an outcome with no visits, or `null` when there are visits. */
export function outcomeWarning(outcome: AssignmentOutcome): string | null {
  if (!hasNoVisits(outcome)) return null
  return outcome.nextVisitDate
    ? fillCopy(copy.noVisitsWarning, { date: dateLabel(outcome.nextVisitDate) })
    : copy.noVisitsWarningNoDate
}

/** The facts as short lines: updated, generated, next visit, left alone. Zero counts are skipped. */
export function outcomeLines(outcome: AssignmentOutcome): string[] {
  const lines: string[] = []
  if (outcome.visitsUpdated > 0) lines.push(plural(outcome.visitsUpdated, copy.updatedOne, copy.updated))
  if (outcome.visitsGenerated > 0) lines.push(plural(outcome.visitsGenerated, copy.generatedOne, copy.generated))
  if (outcome.nextVisitDate) lines.push(fillCopy(copy.nextVisit, { date: dateLabel(outcome.nextVisitDate) }))
  if (outcome.overriddenVisits > 0) lines.push(plural(outcome.overriddenVisits, copy.overriddenOne, copy.overridden))
  return lines
}

/** One sentence for a toast: the warning when there are no visits, else the counts. */
export function outcomesToastDescription(outcomes: readonly AssignmentOutcome[]): string | undefined {
  if (outcomes.length === 0) return undefined
  const warned = outcomes.filter(hasNoVisits)
  if (warned.length > 0) {
    return warned.length === 1
      ? (outcomeWarning(warned[0]!) as string)
      : fillCopy(copy.toastNoVisitsMany, { count: warned.length })
  }
  const updated = outcomes.reduce((sum, outcome) => sum + outcome.visitsUpdated, 0)
  const generated = outcomes.reduce((sum, outcome) => sum + outcome.visitsGenerated, 0)
  return fillCopy(copy.toastTotals, { updated, generated })
}
