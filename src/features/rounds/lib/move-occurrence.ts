import { api } from '@/api/client'
import type { PlannerOccurrence } from '@/api/rounds.api'
import { addDays } from '@/features/rounds/lib/planner'

/*
 * Move a round date (GET /rounds/:id/move-occurrence/preview, POST /rounds/:id/move-occurrence).
 * The types below are hand-written while the backend endpoints are in flight: replace them with the
 * generated ones from src/api/types.gen.ts once the OpenAPI spec includes them.
 */

export type MoveOccurrenceKind = 'REAL' | 'FORECAST'

export interface MoveOccurrenceBlockedDate {
  date: string
  reason: 'CLOSURE' | 'CLOSED_DAY'
  label: string
}

/** The server's verdict on one target date (present when the preview is asked with `toDate`). */
export interface MoveOccurrenceCheck {
  toDate: string
  ok: boolean
  code: string | null
  /** User-readable; shown as-is. */
  message: string | null
  clashCount: number
  /** A non-blocking note (e.g. a non-working day); does not affect `ok`. Older servers omit it. */
  warning?: string | null
}

export interface MoveOccurrencePreview {
  fromDate: string
  kind: MoveOccurrenceKind
  propertyCount: number
  /** The window the date may move within: after the round's previous date, before its next one. */
  earliestDate: string
  latestDate: string
  blockedDates: MoveOccurrenceBlockedDate[]
  /** Dates inside the window outside the business's working week: allowed, but warned about. Older servers omit it. */
  nonWorkingDates?: string[]
  check: MoveOccurrenceCheck | null
}

export interface MoveOccurrenceInput {
  fromDate: string
  toDate: string
  notifyCustomers: boolean
  message?: string
}

export interface MoveOccurrenceResult {
  fromDate: string
  toDate: string
  kind: MoveOccurrenceKind
  movedVisits: number
  createdVisits: number
  notifiedCustomers: number
  customerNotificationError: string | null
  /** A non-blocking note about the move (e.g. it landed on a non-working day). Older servers omit it. */
  warning?: string | null
}

export const moveOccurrenceApi = {
  preview: (roundId: string, params: { fromDate: string; toDate?: string }, signal?: AbortSignal) => {
    const search = new URLSearchParams({ fromDate: params.fromDate })
    if (params.toDate) search.set('toDate', params.toDate)
    return api<MoveOccurrencePreview>(`/rounds/${roundId}/move-occurrence/preview?${search.toString()}`, { signal })
  },

  move: (roundId: string, input: MoveOccurrenceInput) =>
    api<MoveOccurrenceResult>(`/rounds/${roundId}/move-occurrence`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),
}

/** Why a date can't be picked as the new date. */
export type MoveDateBlock =
  | { kind: 'PAST' }
  | { kind: 'OUTSIDE_WINDOW' }
  | { kind: 'CURRENT' }
  | { kind: 'CLOSURE' | 'CLOSED_DAY'; label: string }

/** Null when `date` can be picked; otherwise the reason it can't. */
export function moveDateBlock(date: string, preview: MoveOccurrencePreview, today: string): MoveDateBlock | null {
  if (date < today) return { kind: 'PAST' }
  if (date < preview.earliestDate || date > preview.latestDate) return { kind: 'OUTSIDE_WINDOW' }
  if (date === preview.fromDate) return { kind: 'CURRENT' }
  const blocked = preview.blockedDates.find((item) => item.date === date)
  if (blocked) return { kind: blocked.reason, label: blocked.label }
  return null
}

/** A non-working day can still be picked; the server warns about it instead of blocking. */
export function isNonWorkingDate(date: string, preview: MoveOccurrencePreview): boolean {
  return (preview.nonWorkingDates ?? []).includes(date)
}

/**
 * The date the picker starts on: today when today is inside the window, otherwise the earliest date.
 * If that one can't be picked (the current date, a closure…) or is a non-working day, the next working date
 * that can; failing that, the first non-working date that can; null if none.
 */
export function defaultMoveDate(preview: MoveOccurrencePreview, today: string): string | null {
  const start = today >= preview.earliestDate && today <= preview.latestDate ? today : preview.earliestDate
  let fallback: string | null = null
  for (let date = start; date <= preview.latestDate; date = addDays(date, 1)) {
    if (moveDateBlock(date, preview, today)) continue
    if (!isNonWorkingDate(date, preview)) return date
    fallback ??= date
  }
  return fallback
}

/** Each round's next forecast date: its first projected entry on or after today. */
export function nextForecastDates(
  byRoundId: ReadonlyMap<string, readonly PlannerOccurrence[]>,
  today: string,
): Map<string, string> {
  const out = new Map<string, string>()
  for (const [roundId, occurrences] of byRoundId) {
    const next = occurrences
      .filter((occurrence) => occurrence.projected && occurrence.date >= today)
      .reduce<string | null>((min, occurrence) => (min === null || occurrence.date < min ? occurrence.date : min), null)
    if (next) out.set(roundId, next)
  }
  return out
}

type MovableCard = { roundId: string; date: string; projected: boolean }

/** A real round date can move when it is today or later. */
export function canMoveRealCard(card: MovableCard, today: string): boolean {
  return !card.projected && card.date >= today
}

/** A forecast can move only when it is the round's next forecast date. */
export function canMoveForecastCard(card: MovableCard, nextForecast: ReadonlyMap<string, string>, today: string): boolean {
  return card.projected && card.date >= today && nextForecast.get(card.roundId) === card.date
}
