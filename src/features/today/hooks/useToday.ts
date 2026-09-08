import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  roundsApi,
  type PushMissedInput,
  type ReassignInput,
} from '@/api/rounds.api'
import { todayApi, type CloseDayInput } from '@/api/today.api'
import { invalidateToday, queryKeys } from '@/lib/query-keys'

export function useToday(enabled = true) {
  return useQuery({
    queryKey: queryKeys.today.aggregate,
    queryFn: ({ signal }) => todayApi.get(signal),
    enabled,
  })
}

export function useCloseToday() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CloseDayInput) => todayApi.close(input),
    onSuccess: () => invalidateToday(queryClient),
  })
}

export function useRoundToday(roundId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.rounds.today(roundId),
    queryFn: ({ signal }) => roundsApi.getToday(roundId, signal),
    enabled: enabled && Boolean(roundId),
  })
}

export function usePushMissedJobs() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: PushMissedInput }) =>
      roundsApi.pushMissed(id, input),
    onSuccess: (_data, { id }) => {
      void invalidateToday(queryClient)
      void queryClient.invalidateQueries({ queryKey: queryKeys.rounds.today(id) })
    },
  })
}

export function useReassignRoundTechnician() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ReassignInput }) =>
      roundsApi.reassign(id, input),
    onSuccess: (_data, { id }) => {
      void invalidateToday(queryClient)
      void queryClient.invalidateQueries({ queryKey: queryKeys.rounds.today(id) })
    },
  })
}
