import type { PlannerDayResult } from '@/api/rounds.api'
import {
  addDays,
  startOfWeek,
  visitStatusMatchesFilter,
  type PlannerListStop,
  type PlannerStatusFilter,
} from '@/features/rounds/lib/planner'

export type MapMode = 'day' | 'week'

export type PlannerStopFilter = {
  technicianId: string
  statusId: PlannerStatusFilter
  /** Lower-cased search text; empty matches everything. */
  query: string
}

/** The Mon–Sun dates of the week containing `date` (GAP-023 week map). */
export function weekDates(date: string): string[] {
  const monday = startOfWeek(date)
  return Array.from({ length: 7 }, (_, index) => addDays(monday, index))
}

/** Same rules as the List view: technician, visit status and free-text search. */
export function filterPlannerStops(
  stops: readonly PlannerListStop[],
  { technicianId, statusId, query }: PlannerStopFilter,
): PlannerListStop[] {
  return stops.filter((stop) => {
    if (technicianId !== 'all' && stop.technicianId !== technicianId) return false
    if (!visitStatusMatchesFilter(stop.status, statusId)) return false
    if (!query) return true
    return [stop.addressLine, stop.postcode, stop.customerName, stop.propertyName ?? '', stop.roundName]
      .join(' ')
      .toLowerCase()
      .includes(query)
  })
}

/** Every stop across `dates` for the given rounds, in date then round order. */
export function stopsForDates(
  byDate: ReadonlyMap<string, ReadonlyMap<string, PlannerDayResult>>,
  dates: readonly string[],
  rounds: readonly { id: string; name: string }[],
): PlannerListStop[] {
  return dates.flatMap((date) => {
    const day = byDate.get(date)
    return rounds.flatMap((round) => {
      const result = day?.get(round.id)
      if (!result) return []
      return result.stops.map((stop) => ({ ...stop, roundId: round.id, roundName: result.roundName || round.name }))
    })
  })
}
