import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  servicePlansApi,
  type ServicePlanPauseInput,
  type ServicePlanUpdateInput,
} from '@/api/service-plans.api'
import { invalidateCustomers, invalidateDebt, invalidateRounds } from '@/lib/query-keys'

export function useUpdateServicePlan() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ServicePlanUpdateInput }) =>
      servicePlansApi.update(id, input),
    onSuccess: (_data, { input }) => {
      void invalidateCustomers(queryClient)
      // A plan's frequency drives when its round schedules it.
      if (input.cleaningFrequency !== undefined) void invalidateRounds(queryClient)
    },
  })
}

export function usePauseServicePlan() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ServicePlanPauseInput }) =>
      servicePlansApi.pause(id, input),
    onSuccess: () => {
      void invalidateCustomers(queryClient)
      void invalidateDebt(queryClient)
    },
  })
}

export function useResumeServicePlan() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => servicePlansApi.resume(id),
    onSuccess: () => {
      void invalidateCustomers(queryClient)
      void invalidateDebt(queryClient)
    },
  })
}
