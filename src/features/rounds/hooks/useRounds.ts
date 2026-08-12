import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  roundsApi,
  type RoundCreateInput,
  type RoundStatus,
  type RoundUpdateInput,
} from '@/api/rounds.api'
import { invalidateRounds, queryKeys } from '@/lib/query-keys'

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
