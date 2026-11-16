import type { Closure, IsoDate } from '@/features/closures/types'

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

function appliesToRound(closure: Closure, roundId?: string): boolean {
  if (roundId === undefined || closure.roundIds.length === 0) return true
  return closure.roundIds.includes(roundId)
}

/**
 * Closures covering `date` (inclusive of both ends), earliest start first. An empty `roundIds` means every
 * round; with a `roundId` only closures that apply to that round count. Dates compare as `YYYY-MM-DD` strings.
 */
export function closuresForDate(date: IsoDate, closures: readonly Closure[], roundId?: string): Closure[] {
  if (!ISO_DATE.test(date)) return []
  return closures
    .filter((closure) => closure.startDate <= date && date <= closure.endDate && appliesToRound(closure, roundId))
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
}

/** The first closure (by start date) covering `date`, or null. */
export function closureForDate(date: IsoDate, closures: readonly Closure[], roundId?: string): Closure | null {
  return closuresForDate(date, closures, roundId)[0] ?? null
}
