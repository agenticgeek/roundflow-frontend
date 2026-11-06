import type { CarryoverOption, CarryoverResult } from '@/api/carryover.api'
import { carryoverContent } from '@/content/carryover'
import { formatShortDate } from '@/lib/round-dates'

const copy = carryoverContent

/** The pre-selected option (Monday on a Friday); falls back to the first one. */
export function defaultOption(options: readonly CarryoverOption[] | undefined): CarryoverOption | undefined {
  return options?.find((option) => option.default) ?? options?.[0]
}

export function conflictReason(reason: string): string {
  return copy.preview.reasons[reason] ?? copy.preview.reasonFallback.replace('{reason}', reason)
}

/** "Sam is not available", using the technician's name when known. */
export function conflictLine(conflict: CarryoverResult['conflicts'][number], names: ReadonlyMap<string, string>): string {
  return copy.preview.conflict
    .replace('{technician}', names.get(conflict.technicianId) || copy.preview.unknownTechnician)
    .replace('{reason}', conflictReason(conflict.reason))
}

/** One line per distinct technician and reason (a technician with five visits shows once). */
export function conflictLines(conflicts: CarryoverResult['conflicts'], names: ReadonlyMap<string, string>): string[] {
  return [...new Set(conflicts.map((conflict) => conflictLine(conflict, names)))]
}

export function movedText(count: number, date: string, kind: 'preview' | 'result'): string {
  const source = kind === 'preview' ? copy.preview : copy.result
  if (count === 0) return kind === 'preview' ? copy.preview.none : copy.result.nothingMoved
  return (count === 1 ? source.movedOne : source.moved).replace('{count}', String(count)).replace('{date}', formatShortDate(date))
}

/** "Carried over from Thu 5 Nov", or just "Carried over" when the date is unknown. */
export function carriedOverBadge(fromDate: string | null | undefined): string {
  return fromDate ? copy.badge.replace('{date}', formatShortDate(fromDate)) : copy.badgeNoDate
}
