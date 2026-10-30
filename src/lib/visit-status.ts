import type { components } from '@/api/types.gen'

/**
 * Visit status as the web handles it: the spec's values plus `CANCELLED`, which backend A4 adds
 * (pausing a plan cancels its scheduled visits). The web ships first, so every mapping is an
 * exhaustive `switch` ending in `exhaustiveFallback` — the compiler finds any that miss a status.
 */
export type VisitStatus = components['schemas']['VisitStatus'] | 'CANCELLED'

/** Why a visit was cancelled (A4) — `null` / absent for any other status. */
export type VisitCancelReason = 'PAUSED' | 'FREQUENCY_CHANGED' | 'ROUND_CHANGED'

export const VISIT_STATUSES = [
  'SCHEDULED',
  'IN_PROGRESS',
  'COMPLETED',
  'SKIPPED',
  'CANCELLED',
] as const satisfies readonly VisitStatus[]

/**
 * Exhaustiveness check for mappers over API data: `value: never` makes the compiler flag a
 * missed status, while a value the backend adds before the web knows it renders as `fallback`
 * instead of crashing the screen.
 */
export function exhaustiveFallback<T>(value: never, fallback: T): T {
  void value
  return fallback
}
