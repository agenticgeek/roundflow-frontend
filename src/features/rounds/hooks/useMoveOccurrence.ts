import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { PlannerOccurrence } from '@/api/rounds.api'
import { useRoundsOccurrences } from '@/features/rounds/hooks/useRounds'
import {
  canMoveForecastCard,
  moveOccurrenceApi,
  nextForecastDates,
  type MoveOccurrenceInput,
} from '@/features/rounds/lib/move-occurrence'
import type { PlannerRoundCard } from '@/features/rounds/lib/planner'
import { addDays, MAX_PLANNER_RANGE_DAYS, todayIsoDate } from '@/features/rounds/lib/planner'
import { invalidateCustomers, invalidateToday, queryKeys } from '@/lib/query-keys'

/** Under `rounds`, so a successful move (which invalidates rounds) also drops stale previews. */
function previewKey(roundId: string, fromDate: string, toDate?: string) {
  return [...queryKeys.rounds.all, 'move-occurrence-preview', roundId, fromDate, toDate ?? ''] as const
}

/** GET /rounds/:id/move-occurrence/preview — the window, blocked dates and, with `toDate`, the check for it. */
export function useMoveOccurrencePreview(roundId: string, fromDate: string, toDate?: string, enabled = true) {
  return useQuery({
    queryKey: previewKey(roundId, fromDate, toDate),
    queryFn: ({ signal }) => moveOccurrenceApi.preview(roundId, { fromDate, toDate }, signal),
    enabled: enabled && Boolean(roundId) && Boolean(fromDate),
    // The window and the check can change under us (another move, a new closure): always re-ask.
    staleTime: 0,
  })
}

/** POST /rounds/:id/move-occurrence — visits move, so planner, Today's Work and customers refresh. */
export function useMoveOccurrence() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ roundId, input }: { roundId: string; input: MoveOccurrenceInput }) =>
      moveOccurrenceApi.move(roundId, input),
    onSuccess: () => {
      void invalidateToday(queryClient)
      void invalidateCustomers(queryClient)
    },
    // A 409 means something changed since the preview (a closure, another move): re-ask for the window and check.
    onError: (_error, { roundId }) =>
      void queryClient.invalidateQueries({ queryKey: [...queryKeys.rounds.all, 'move-occurrence-preview', roundId] }),
  })
}

export interface MoveDateTarget {
  roundId: string
  roundName: string
  date: string
  projected: boolean
}

/**
 * Planner wiring for "Move date" on forecast cards: which forecast is each round's next one, and the open dialog.
 * Forecasts are worked out from today regardless of the window, so when the window starts after today the
 * planner's own data can't tell whether an earlier forecast exists: fetch from today in that case only.
 */
export function usePlannerMoveDate(
  roundIds: string[],
  window: { from: string; to: string },
  loaded: ReadonlyMap<string, readonly PlannerOccurrence[]>,
  canMutate: boolean,
) {
  const today = todayIsoDate()
  const [target, setTarget] = useState<MoveDateTarget | null>(null)
  const needsOwnFetch = canMutate && window.from > today
  // The planner endpoints cap a range at 90 days.
  const to = window.to < addDays(today, MAX_PLANNER_RANGE_DAYS - 1) ? window.to : addDays(today, MAX_PLANNER_RANGE_DAYS - 1)
  const fromToday = useRoundsOccurrences(roundIds, { from: today, to }, needsOwnFetch)
  const nextForecast = canMutate ? nextForecastDates(needsOwnFetch ? fromToday.byRoundId : loaded, today) : new Map<string, string>()

  return {
    target,
    canMoveCard: (card: PlannerRoundCard) => canMoveForecastCard(card, nextForecast, today),
    onMoveCard: canMutate
      ? (card: PlannerRoundCard) =>
          setTarget({ roundId: card.roundId, roundName: card.roundName, date: card.date, projected: card.projected })
      : undefined,
    close: () => setTarget(null),
  }
}
