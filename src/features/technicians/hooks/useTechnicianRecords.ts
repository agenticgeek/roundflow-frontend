import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  technicianRecordsApi,
  type AvailabilityInput,
  type IncidentInput,
  type PerformancePeriod,
  type ReplaceTechnicianInput,
} from '@/api/technician-records.api'
import { invalidateDashboard, invalidateToday, queryKeys } from '@/lib/query-keys'

export function useTechnicianPerformance(id: string, period: PerformancePeriod) {
  return useQuery({
    queryKey: queryKeys.technicians.performance(id, period),
    queryFn: ({ signal }) => technicianRecordsApi.performance(id, period, signal),
    placeholderData: keepPreviousData,
  })
}

export function useTechnicianIncidents(id: string) {
  return useQuery({
    queryKey: queryKeys.technicians.incidents(id),
    queryFn: ({ signal }) => technicianRecordsApi.incidents(id, {}, signal),
  })
}

export function useTechnicianAvailability(id: string) {
  return useQuery({
    queryKey: queryKeys.technicians.availability(id),
    queryFn: ({ signal }) => technicianRecordsApi.availability(id, signal),
  })
}

/** Incidents feed the KPIs (strikes / damages / upsells), so performance and the dashboard refresh. */
function useIncidentInvalidation(id: string) {
  const queryClient = useQueryClient()
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.technicians.incidents(id) }),
      queryClient.invalidateQueries({ queryKey: ['technicians', 'performance', id] }),
      invalidateDashboard(queryClient),
    ])
}

export function useRecordIncident(id: string) {
  const invalidate = useIncidentInvalidation(id)
  return useMutation({
    mutationFn: (input: IncidentInput) => technicianRecordsApi.recordIncident(id, input),
    meta: { silenceGlobalError: true },
    onSuccess: invalidate,
  })
}

export function useDeleteIncident(id: string) {
  const invalidate = useIncidentInvalidation(id)
  return useMutation({
    mutationFn: (incidentId: string) => technicianRecordsApi.deleteIncident(incidentId),
    meta: { silenceGlobalError: true },
    onSuccess: invalidate,
  })
}

/** Availability windows restamp visits, so Today's Work and the planner refresh too. */
function useAvailabilityInvalidation(id: string) {
  const queryClient = useQueryClient()
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.technicians.availability(id) }),
      invalidateToday(queryClient),
    ])
}

export function useAddAvailability(id: string) {
  const invalidate = useAvailabilityInvalidation(id)
  return useMutation({
    mutationFn: (input: AvailabilityInput) => technicianRecordsApi.addAvailability(id, input),
    meta: { silenceGlobalError: true },
    onSuccess: invalidate,
  })
}

export function useRemoveAvailability(id: string) {
  const invalidate = useAvailabilityInvalidation(id)
  return useMutation({
    mutationFn: (availabilityId: string) => technicianRecordsApi.removeAvailability(id, availabilityId),
    meta: { silenceGlobalError: true },
    onSuccess: invalidate,
  })
}

export function useReplaceTechnician(id: string) {
  const invalidate = useAvailabilityInvalidation(id)
  return useMutation({
    mutationFn: (input: ReplaceTechnicianInput) => technicianRecordsApi.replace(id, input),
    meta: { silenceGlobalError: true },
    onSuccess: invalidate,
  })
}
