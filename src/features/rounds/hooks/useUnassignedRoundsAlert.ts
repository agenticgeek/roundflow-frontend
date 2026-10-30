import { useMemo } from 'react'
import type { PlannerStop } from '@/api/rounds.api'
import { useRounds, useRoundsOccurrenceDays, useRoundsOccurrences } from '@/features/rounds/hooks/useRounds'
import { addDays, todayIso } from '@/lib/round-dates'

/** How far ahead the planner warns about visits with no technician. */
export const UNASSIGNED_ALERT_DAYS = 14

export interface UnassignedRound {
  roundId: string
  roundName: string
  /** First date in the window with unassigned visits (`YYYY-MM-DD`). */
  nextDate: string
  /** Unassigned visits on that first date. */
  nextVisits: number
}

export interface UnassignedRoundsAlert {
  /** Rounds with unassigned visits coming up, soonest first. */
  rounds: UnassignedRound[]
  /** All unassigned visits in the window. */
  totalVisits: number
}

/** A visit still to do with nobody on it. Done, skipped or cancelled visits don't need anyone. */
function needsTechnician(stop: PlannerStop): boolean {
  if (stop.status === 'COMPLETED' || stop.status === 'SKIPPED' || stop.status === 'CANCELLED') return false
  return !stop.technicianId && !stop.technicianName
}

/**
 * Upcoming visits with no technician, over the next two weeks. Assignment is per visit
 * (SRS FR-ROUND-10: each new recurrence starts unassigned), so a round having technicians
 * says nothing about its visits — this reads the visits themselves:
 *
 * 1. `GET /rounds` → active round ids.
 * 2. Batched occurrences → which dates each round has visits on.
 * 3. Batched day stops for just those dates → visits whose `technicianId` is null.
 *
 * `null` while loading or when nothing needs attention.
 */
export function useUnassignedRoundsAlert(): UnassignedRoundsAlert | null {
  const roundsQuery = useRounds('ACTIVE')
  const rounds = useMemo(() => roundsQuery.data ?? [], [roundsQuery.data])
  const ids = useMemo(() => rounds.map((round) => round.id), [rounds])

  const from = todayIso()
  const to = addDays(from, UNASSIGNED_ALERT_DAYS - 1)
  const occurrences = useRoundsOccurrences(ids, { from, to }, ids.length > 0)

  // One day-stops request per date (per 50 rounds), for only the rounds with visits that day.
  const dayRequests = useMemo(() => {
    const roundIdsByDate = new Map<string, string[]>()
    for (const id of ids) {
      for (const occurrence of occurrences.byRoundId.get(id) ?? []) {
        if (occurrence.stopCount === 0 || occurrence.date < from || occurrence.date > to) continue
        roundIdsByDate.set(occurrence.date, [...(roundIdsByDate.get(occurrence.date) ?? []), id])
      }
    }
    return [...roundIdsByDate.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, roundIds]) => ({ date, roundIds }))
  }, [from, ids, occurrences.byRoundId, to])

  const days = useRoundsOccurrenceDays(dayRequests, !occurrences.isLoading)

  return useMemo(() => {
    if (ids.length === 0 || occurrences.isLoading || days.isLoading) return null

    const nameById = new Map(rounds.map((round) => [round.id, round.name]))
    const byRound = new Map<string, UnassignedRound>()
    let totalVisits = 0

    // Requests are in date order, so the first hit per round is its soonest.
    for (const { date, roundIds } of dayRequests) {
      const day = days.byDate.get(date)
      for (const roundId of roundIds) {
        const unassigned = (day?.get(roundId)?.stops ?? []).filter(needsTechnician).length
        if (unassigned === 0) continue
        totalVisits += unassigned
        if (!byRound.has(roundId)) {
          byRound.set(roundId, {
            roundId,
            roundName: nameById.get(roundId) ?? '',
            nextDate: date,
            nextVisits: unassigned,
          })
        }
      }
    }

    if (byRound.size === 0) return null
    const affected = [...byRound.values()].sort(
      (a, b) => a.nextDate.localeCompare(b.nextDate) || a.roundName.localeCompare(b.roundName),
    )
    return { rounds: affected, totalVisits }
  }, [dayRequests, days.byDate, days.isLoading, ids.length, occurrences.isLoading, rounds])
}
