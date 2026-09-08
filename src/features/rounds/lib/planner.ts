import type { PlannerOccurrence, PlannerStop, RoundListItem } from '@/api/rounds.api'

/**
 * Round Planner derivations — everything the backend does not return.
 * All dates are UTC calendar dates (`YYYY-MM-DD`); never apply a local offset.
 */

export type PlannerPeriod = 'week' | 'cycle'

/** Day-progress label derived from an occurrence summary (mirrors backend today.service rule). */
export type PlannerDayStatus = 'not_started' | 'in_progress' | 'completed'

export type PlannerStatusFilter = 'all' | PlannerDayStatus

export interface PlannerRoundCard {
  key: string
  roundId: string
  roundName: string
  date: string
  stopCount: number
  totalValue: number
  completedCount: number
  holdCount: number
  issueCount: number
  status: PlannerDayStatus
  technicianName: string | null
}

export interface PlannerDayCell {
  date: string
  cards: PlannerRoundCard[]
}

export interface PlannerWeekRow {
  id: string
  dates: string[]
}

export interface PlannerWindow {
  from: string
  to: string
  weeks: PlannerWeekRow[]
}

export interface PlannerKpis {
  stopCount: number
  totalValue: number
  completedCount: number
  completionPct: number
  holdCount: number
  issueCount: number
  estimatedMinutes: number
}

/** Merged stop for List/Map — day endpoint stop plus the round it came from. */
export type PlannerListStop = PlannerStop & { roundId: string; roundName: string }

/** Backend `GET /today` heuristic — no duration field exists in the schema. */
export const ESTIMATED_MINUTES_PER_STOP = 20

/** Planner endpoints reject ranges longer than this (400). */
export const MAX_PLANNER_RANGE_DAYS = 90

const DAY_MS = 86_400_000

export function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export function parseIsoDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`)
}

export function addDays(value: string, days: number): string {
  return toIsoDate(new Date(parseIsoDate(value).getTime() + days * DAY_MS))
}

export function todayIsoDate(): string {
  return toIsoDate(new Date())
}

/** Monday of the week containing `value` (UTC). */
export function startOfWeek(value: string): string {
  const day = parseIsoDate(value).getUTCDay() // 0 = Sun
  const offset = day === 0 ? -6 : 1 - day
  return addDays(value, offset)
}

export function isBetween(value: string, from: string, to: string): boolean {
  return value >= from && value <= to
}

/**
 * Build the visible window from a period and anchor date.
 * Week → Mon–Sun containing the anchor. Cycle → Monday of the anchor week for
 * `cycleLengthDays`, rounded up to whole weeks and capped at the API's 90-day limit.
 */
export function buildPlannerWindow(
  period: PlannerPeriod,
  anchor: string,
  cycleLengthDays: number | null | undefined,
): PlannerWindow {
  const from = startOfWeek(anchor)
  const requestedDays = period === 'week' ? 7 : Math.max(7, cycleLengthDays ?? 28)
  const weekCount = Math.min(
    Math.ceil(requestedDays / 7),
    Math.floor(MAX_PLANNER_RANGE_DAYS / 7),
  )
  const weeks: PlannerWeekRow[] = Array.from({ length: weekCount }, (_, weekIndex) => {
    const monday = addDays(from, weekIndex * 7)
    return {
      id: monday,
      dates: Array.from({ length: 7 }, (_, dayIndex) => addDays(monday, dayIndex)),
    }
  })
  return { from, to: addDays(from, weekCount * 7 - 1), weeks }
}

/** Number of days to move the anchor when paging the window. */
export function windowStepDays(window: PlannerWindow): number {
  return window.weeks.length * 7
}

export function deriveDayStatus(
  occurrence: Pick<PlannerOccurrence, 'stopCount' | 'completedCount'>,
): PlannerDayStatus {
  if (occurrence.stopCount === 0) return 'not_started'
  if (occurrence.completedCount === occurrence.stopCount) return 'completed'
  if (occurrence.completedCount > 0) return 'in_progress'
  return 'not_started'
}

/** Map the derived day-status filter to a per-visit status on List view. */
export function visitStatusMatchesFilter(visitStatus: string, filter: PlannerStatusFilter): boolean {
  if (filter === 'all') return true
  if (filter === 'completed') return visitStatus === 'COMPLETED'
  if (filter === 'in_progress') return visitStatus === 'IN_PROGRESS'
  return visitStatus === 'SCHEDULED'
}

export function buildRoundCards(
  round: Pick<RoundListItem, 'id' | 'name'>,
  occurrences: PlannerOccurrence[],
  technicianName: string | null,
): PlannerRoundCard[] {
  return occurrences.map((occurrence) => ({
    key: `${round.id}:${occurrence.date}`,
    roundId: round.id,
    roundName: round.name,
    date: occurrence.date,
    stopCount: occurrence.stopCount,
    totalValue: occurrence.totalValue,
    completedCount: occurrence.completedCount,
    holdCount: occurrence.holdCount,
    issueCount: occurrence.issueCount,
    status: deriveDayStatus(occurrence),
    technicianName,
  }))
}

/** Sum raw counts across the window — never average per-day `completionPct`. */
export function sumKpis(cards: readonly Pick<PlannerRoundCard, 'stopCount' | 'totalValue' | 'completedCount' | 'holdCount' | 'issueCount'>[]): PlannerKpis {
  const totals = cards.reduce(
    (acc, card) => ({
      stopCount: acc.stopCount + card.stopCount,
      totalValue: acc.totalValue + card.totalValue,
      completedCount: acc.completedCount + card.completedCount,
      holdCount: acc.holdCount + card.holdCount,
      issueCount: acc.issueCount + card.issueCount,
    }),
    { stopCount: 0, totalValue: 0, completedCount: 0, holdCount: 0, issueCount: 0 },
  )
  return {
    ...totals,
    completionPct:
      totals.stopCount === 0 ? 0 : Math.round((totals.completedCount / totals.stopCount) * 100),
    estimatedMinutes: totals.stopCount * ESTIMATED_MINUTES_PER_STOP,
  }
}

export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const hours = minutes / 60
  return `${Number.isInteger(hours) ? hours : hours.toFixed(1)} hrs`
}

const shortDate = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })
const longDate = new Intl.DateTimeFormat('en-GB', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
})
const dayLabel = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })
const timeLabel = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' })

/** "6 May" */
export function formatShortDate(value: string): string {
  return shortDate.format(parseIsoDate(value))
}

/** "Mon 6 May 2026" */
export function formatLongDate(value: string): string {
  return longDate.format(parseIsoDate(value))
}

/** "6 May – 2 Jun" */
export function formatWindowLabel(window: Pick<PlannerWindow, 'from' | 'to'>): string {
  return `${dayLabel.format(parseIsoDate(window.from))} – ${dayLabel.format(parseIsoDate(window.to))}`
}

/** "09:45" from an ISO timestamp, or null. */
export function formatTime(value: string | null | undefined): string | null {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : timeLabel.format(date)
}

/** Round-level technician label: "James", "James +1", or null when unassigned. */
export function technicianLabel(technicians: { name: string }[] | undefined): string | null {
  if (!technicians || technicians.length === 0) return null
  const [first, ...rest] = technicians
  const firstName = first.name.split(' ')[0] ?? first.name
  return rest.length > 0 ? `${firstName} +${rest.length}` : firstName
}
