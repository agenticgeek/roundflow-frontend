import { useMutation, useQueryClient } from '@tanstack/react-query'
import { visitsApi, type VisitCreateInput } from '@/api/visits.api'
import { invalidateCustomers, invalidateToday } from '@/lib/query-keys'

/** POST /visits — a one-off visit. Refreshes planner occurrences, Today and customer next-due dates. */
export function useCreateVisit() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: VisitCreateInput) => visitsApi.create(input),
    onSuccess: () => {
      void invalidateToday(queryClient)
      void invalidateCustomers(queryClient)
    },
  })
}
