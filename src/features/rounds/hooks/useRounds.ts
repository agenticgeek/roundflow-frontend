import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  roundsApi,
  type PlannerDayResult,
  type PlannerOccurrence,
  type RoundCreateInput,
  type RoundDetail,
  type RoundStatus,
  type RoundUpdateInput,
} from '@/api/rounds.api'
import { invalidateCustomers, invalidateRounds, queryKeys } from '@/lib/query-keys'

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

export function useSetRoundTechnicians() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      technicianIds,
    }: {
      id: string
      technicianIds: string[]
    }) => roundsApi.setTechnicians(id, technicianIds),
    onSuccess: (_data, { id }) => {
      void invalidateRounds(queryClient)
      void queryClient.invalidateQueries({ queryKey: queryKeys.rounds.detail(id) })
      // Every property assigned to this round shows its technician on Customers / Property Detail.
      void invalidateCustomers(queryClient)
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

/**
 * There is no cross-round planner endpoint — "All rounds" fans out one
 * occurrences call per round and merges client-side (handoff §4.1).
 */
export function useRoundsOccurrences(
  roundIds: string[],
  range: { from: string; to: string },
  enabled = true,
): FanOutResult<PlannerOccurrence[]> {
  const results = useQueries({
    queries: roundIds.map((id) => ({
      queryKey: queryKeys.rounds.occurrences(id, range.from, range.to),
      queryFn: ({ signal }: { signal?: AbortSignal }) =>
        roundsApi.getOccurrences(id, range, signal),
      enabled: enabled && Boolean(id) && Boolean(range.from && range.to),
    })),
  })
  return collect(roundIds, results)
}

/** Day view (List/Map) across one or many rounds for a single date. */
export function useRoundsOccurrenceDay(
  roundIds: string[],
  date: string,
  enabled = true,
): FanOutResult<PlannerDayResult> {
  const results = useQueries({
    queries: roundIds.map((id) => ({
      queryKey: queryKeys.rounds.occurrenceDay(id, date),
      queryFn: ({ signal }: { signal?: AbortSignal }) =>
        roundsApi.getOccurrenceDay(id, date, signal),
      enabled: enabled && Boolean(id) && Boolean(date),
    })),
  })
  return collect(roundIds, results)
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
