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

/** PATCH /visits/:id/reschedule — a skipped (e.g. weather-held) or scheduled visit onto a new date. */
export function useRescheduleVisit() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ visitId, date }: { visitId: string; date: string }) => visitsApi.reschedule(visitId, date),
    onSuccess: () => {
      void invalidateToday(queryClient)
      void invalidateCustomers(queryClient)
    },
  })
}

/** PATCH /visits/:id/assign — one visit to one technician (or `null` to unassign). */
export function useAssignVisit() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ visitId, technicianId }: { visitId: string; technicianId: string | null }) =>
      visitsApi.assign(visitId, technicianId),
    onSuccess: () => {
      void invalidateToday(queryClient)
      void invalidateCustomers(queryClient)
    },
  })
}
