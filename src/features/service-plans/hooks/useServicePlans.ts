import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  servicePlansApi,
  type ServicePlanPauseInput,
  type ServicePlanUpdateInput,
} from '@/api/service-plans.api'
import { invalidateCustomers, invalidateServiceChange } from '@/lib/query-keys'

export function useUpdateServicePlan() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ServicePlanUpdateInput }) =>
      servicePlansApi.update(id, input),
    // A plan's frequency can move it to another round (GAP-018): header, today and planner change.
    onSuccess: (_data, { input }) =>
      input.cleaningFrequency !== undefined ? invalidateServiceChange(queryClient) : invalidateCustomers(queryClient),
  })
}

export function usePauseServicePlan() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ServicePlanPauseInput }) =>
      servicePlansApi.pause(id, input),
    // Pause / resume change the header, Today's Work, the planner and the debt board (GAP-020).
    onSuccess: () => invalidateServiceChange(queryClient),
  })
}

export function useResumeServicePlan() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => servicePlansApi.resume(id),
    // Pause / resume change the header, Today's Work, the planner and the debt board (GAP-020).
    onSuccess: () => invalidateServiceChange(queryClient),
  })
}
