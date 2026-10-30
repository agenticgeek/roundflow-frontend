import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  PLANNER_BATCH_MAX_ROUNDS,
  roundsApi,
  type PlannerDayResult,
  type PlannerOccurrence,
  type PlannerOccurrencesBatchItem,
  type PlannerStop,
  type RoundCreateInput,
  type RoundDetail,
  type RoundStatus,
  type RoundUpdateInput,
  type SetRoundTechniciansInput,
} from '@/api/rounds.api'
import { ApiError } from '@/lib/errors'
import { invalidateCustomers, invalidateRounds, queryKeys } from '@/lib/query-keys'

/** Per-round fan-out queries reuse cached results this long before refetching. */
const FAN_OUT_STALE_TIME = 60_000

export function useRounds(status?: RoundStatus, enabled = true) {
  return useQuery({
    queryKey: queryKeys.rounds.list(status),
    queryFn: ({ signal }) => roundsApi.list(status, signal),
    enabled,
  })
}

export function useRound(id: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.rounds.detail(id),
    queryFn: ({ signal }) => roundsApi.get(id, signal),
    enabled: enabled && Boolean(id),
  })
}

export function useCreateRound() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: RoundCreateInput) => roundsApi.create(input),
    onSuccess: () => invalidateRounds(queryClient),
  })
}

export function useUpdateRound() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: RoundUpdateInput }) =>
      roundsApi.update(id, input),
    onSuccess: (_data, { id }) => {
      void invalidateRounds(queryClient)
      void queryClient.invalidateQueries({ queryKey: queryKeys.rounds.detail(id) })
      // Round name/status changes are echoed on every property assigned to it.
      void invalidateCustomers(queryClient)
    },
  })
}

/** PUT /rounds/:id/technicians with an optional split (GAP-012); returns the allocation. */
export function useSetRoundTechnicians() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: SetRoundTechniciansInput }) =>
      roundsApi.setTechnicians(id, input),
    onSuccess: () => {
      // Round detail + allocation (both under `rounds`), and restamped visits on Today's Work.
      void invalidateRounds(queryClient)
      void queryClient.invalidateQueries({ queryKey: queryKeys.today.all })
      // Every property assigned to this round shows its technician on Customers / Property Detail.
      void invalidateCustomers(queryClient)
    },
  })
}

/** POST /rounds/:id/generate-visits — create due visits now instead of on the nightly run. */
export function useGenerateRoundVisits() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => roundsApi.generateVisits(id),
    onSuccess: () => {
      void invalidateRounds(queryClient)
      void queryClient.invalidateQueries({ queryKey: queryKeys.today.all })
    },
  })
}

export function useRoundOccurrences(
  id: string,
  range: { from?: string; to?: string },
  enabled = true,
) {
  return useQuery({
    queryKey: queryKeys.rounds.occurrences(id, range.from, range.to),
    queryFn: ({ signal }) => roundsApi.getOccurrences(id, range, signal),
    enabled: enabled && Boolean(id) && Boolean(range.from || range.to),
  })
}

export function useRoundOccurrenceDay(id: string, date: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.rounds.occurrenceDay(id, date),
    queryFn: ({ signal }) => roundsApi.getOccurrenceDay(id, date, signal),
    enabled: enabled && Boolean(id) && Boolean(date),
  })
}

export interface FanOutResult<T> {
  /** One entry per round id, in the same order; `undefined` until loaded. */
  byRoundId: Map<string, T>
  isLoading: boolean
  isFetching: boolean
  isError: boolean
  error: unknown
  refetch: () => void
}

function collect<T>(
  roundIds: string[],
  results: { data?: T; isLoading: boolean; isFetching: boolean; isError: boolean; error: unknown; refetch: () => unknown }[],
): FanOutResult<T> {
  const byRoundId = new Map<string, T>()
  results.forEach((result, index) => {
    const id = roundIds[index]
    if (id && result.data !== undefined) byRoundId.set(id, result.data)
  })
  return {
    byRoundId,
    isLoading: results.some((result) => result.isLoading),
    isFetching: results.some((result) => result.isFetching),
    isError: results.some((result) => result.isError),
    error: results.find((result) => result.isError)?.error,
    refetch: () => results.forEach((result) => void result.refetch()),
  }
}

function chunk<T>(items: readonly T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

/**
 * One batch request for a chunk of rounds. If the backend doesn't have the batch route yet
 * (404), falls back to the per-round endpoint so the planner works against either version.
 */
async function fetchOccurrencesChunk(
  roundIds: string[],
  range: { from: string; to: string },
  signal?: AbortSignal,
): Promise<PlannerOccurrencesBatchItem[]> {
  try {
    return await roundsApi.getOccurrencesBatch(roundIds, range, signal)
  } catch (error) {
    if (!(error instanceof ApiError && error.status === 404)) throw error
    const perRound = await Promise.all(
      roundIds.map((id) => roundsApi.getOccurrences(id, range, signal)),
    )
    return roundIds.map((roundId, index) => ({ roundId, occurrences: perRound[index] ?? [] }))
  }
}

/**
 * Occurrence summaries across rounds via GET /rounds/planner/occurrences — one request per
 * 50 rounds instead of one per round. Same result shape as before, keyed by round id.
 */
export function useRoundsOccurrences(
  roundIds: string[],
  range: { from: string; to: string },
  enabled = true,
): FanOutResult<PlannerOccurrence[]> {
  const chunks = chunk(roundIds, PLANNER_BATCH_MAX_ROUNDS)
  const results = useQueries({
    queries: chunks.map((ids) => ({
      queryKey: queryKeys.rounds.occurrencesBatch(ids, range.from, range.to),
      queryFn: ({ signal }: { signal?: AbortSignal }) =>
        fetchOccurrencesChunk(ids, range, signal),
      enabled: enabled && ids.length > 0 && Boolean(range.from && range.to),
      // Keep results briefly so quick re-navigation doesn't refetch. Mutations still
      // invalidate rounds, so completions etc. refresh immediately.
      staleTime: FAN_OUT_STALE_TIME,
    })),
  })

  const byRoundId = new Map<string, PlannerOccurrence[]>()
  results.forEach((result) => {
    result.data?.forEach((item) => byRoundId.set(item.roundId, item.occurrences))
  })
  return {
    byRoundId,
    isLoading: results.some((result) => result.isLoading),
    isFetching: results.some((result) => result.isFetching),
    isError: results.some((result) => result.isError),
    error: results.find((result) => result.isError)?.error,
    refetch: () => results.forEach((result) => void result.refetch()),
  }
}

/** The per-round day summary, worked out from the stops (the batch endpoint doesn't send it). */
function summariseStops(stops: PlannerStop[]): PlannerDayResult['summary'] {
  const completedCount = stops.filter((stop) => stop.status === 'COMPLETED').length
  return {
    stopCount: stops.length,
    totalValue: stops.reduce((sum, stop) => sum + (Number(stop.price) || 0), 0),
    completedCount,
    completionPct: stops.length ? Math.round((completedCount / stops.length) * 100) : 0,
    holdCount: stops.filter((stop) => stop.paymentHold).length,
    issueCount: stops.filter((stop) => stop.issues.length > 0).length,
  }
}

/**
 * One batched request for a chunk of rounds' stops on a date. A backend without the batch
 * route (404) falls back to the per-round endpoint.
 */
async function fetchDayChunk(
  roundIds: string[],
  date: string,
  signal?: AbortSignal,
): Promise<PlannerDayResult[]> {
  try {
    const items = await roundsApi.getOccurrenceDayBatch(roundIds, date, signal)
    return items.map((item) => ({
      roundId: item.roundId,
      roundName: '',
      date,
      stops: item.stops,
      summary: summariseStops(item.stops),
    }))
  } catch (error) {
    if (!(error instanceof ApiError && error.status === 404)) throw error
    return Promise.all(roundIds.map((id) => roundsApi.getOccurrenceDay(id, date, signal)))
  }
}

/**
 * Day view (List/Map) across one or many rounds for a single date — one request per 50 rounds
 * via GET /rounds/planner/occurrences/:date instead of one per round. `roundName` may be
 * empty: callers fall back to the round's own name.
 */
export function useRoundsOccurrenceDay(
  roundIds: string[],
  date: string,
  enabled = true,
): FanOutResult<PlannerDayResult> {
  const chunks = chunk(roundIds, PLANNER_BATCH_MAX_ROUNDS)
  const results = useQueries({
    queries: chunks.map((ids) => ({
      queryKey: queryKeys.rounds.occurrenceDayBatch(ids, date),
      queryFn: ({ signal }: { signal?: AbortSignal }) => fetchDayChunk(ids, date, signal),
      enabled: enabled && ids.length > 0 && Boolean(date),
      staleTime: FAN_OUT_STALE_TIME,
    })),
  })

  const byRoundId = new Map<string, PlannerDayResult>()
  results.forEach((result) => {
    result.data?.forEach((item) => byRoundId.set(item.roundId, item))
  })
  return {
    byRoundId,
    isLoading: results.some((result) => result.isLoading),
    isFetching: results.some((result) => result.isFetching),
    isError: results.some((result) => result.isError),
    error: results.find((result) => result.isError)?.error,
    refetch: () => results.forEach((result) => void result.refetch()),
  }
}

/**
 * Day stops for several dates at once — each `{ date, roundIds }` is fetched like
 * `useRoundsOccurrenceDay` (shared cache keys). Results keyed `date → roundId`.
 */
export function useRoundsOccurrenceDays(
  requests: readonly { date: string; roundIds: string[] }[],
  enabled = true,
): { byDate: Map<string, Map<string, PlannerDayResult>>; isLoading: boolean; isError: boolean } {
  const queries = requests.flatMap(({ date, roundIds }) =>
    chunk(roundIds, PLANNER_BATCH_MAX_ROUNDS).map((ids) => ({ date, ids })),
  )
  const results = useQueries({
    queries: queries.map(({ date, ids }) => ({
      queryKey: queryKeys.rounds.occurrenceDayBatch(ids, date),
      queryFn: ({ signal }: { signal?: AbortSignal }) => fetchDayChunk(ids, date, signal),
      enabled: enabled && ids.length > 0,
      staleTime: FAN_OUT_STALE_TIME,
    })),
  })

  const byDate = new Map<string, Map<string, PlannerDayResult>>()
  results.forEach((result, index) => {
    const date = queries[index]!.date
    const day = byDate.get(date) ?? new Map<string, PlannerDayResult>()
    result.data?.forEach((item) => day.set(item.roundId, item))
    byDate.set(date, day)
  })
  return {
    byDate,
    isLoading: results.some((result) => result.isLoading),
    isError: results.some((result) => result.isError),
  }
}

/** Round detail per round — the occurrence summary carries no technician data (handoff §6.3). */
export function useRoundDetails(roundIds: string[], enabled = true): FanOutResult<RoundDetail> {
  const results = useQueries({
    queries: roundIds.map((id) => ({
      queryKey: queryKeys.rounds.detail(id),
      queryFn: ({ signal }: { signal?: AbortSignal }) => roundsApi.get(id, signal),
      enabled: enabled && Boolean(id),
      staleTime: 5 * 60 * 1000,
    })),
  })
  return collect(roundIds, results)
}
