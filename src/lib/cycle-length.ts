import type { RecurringCycle } from '@/types/setup-wizard'

const CYCLE_TO_DAYS: Record<RecurringCycle, number> = {
  '1-week': 7,
  '2-week': 14,
  '3-week': 21,
  '4-week': 28,
}

const DAYS_TO_CYCLE = new Map<number, RecurringCycle>(
  Object.entries(CYCLE_TO_DAYS).map(([cycle, days]) => [days, cycle as RecurringCycle]),
)

/** UI recurring cycle → API days (7 | 14 | 21 | 28). */
export function cycleLengthToDays(cycle: RecurringCycle): number {
  return CYCLE_TO_DAYS[cycle]
}

/** API days → UI recurring cycle; defaults to 4-week when unknown. */
export function daysToCycleLength(days: number | null | undefined): RecurringCycle {
  return DAYS_TO_CYCLE.get(days ?? 28) ?? '4-week'
}
