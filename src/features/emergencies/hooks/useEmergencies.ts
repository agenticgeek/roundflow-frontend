import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  emergenciesApi,
  type EmergencyCreateInput,
  type EmergencyStatus,
} from '@/api/emergencies.api'
import { invalidateEmergencies, queryKeys } from '@/lib/query-keys'
import { useAppBootstrap } from '@/providers/AppBootstrapProvider'

/** The bell polls active emergencies on this cadence (handoff §3, Screen 1). */
export const EMERGENCY_POLL_MS = 60_000

function useManagerOnly(enabled = true) {
  const { canMutate } = useAppBootstrap()
  // Every read/reassign endpoint is ADMIN/MANAGER only — technicians get 403.
  return enabled && canMutate
}

export function useEmergencies(status?: EmergencyStatus, enabled = true) {
  return useQuery({
    queryKey: queryKeys.emergencies.list(status),
    queryFn: ({ signal }) => emergenciesApi.list(status, signal),
    enabled: useManagerOnly(enabled),
    refetchInterval: EMERGENCY_POLL_MS,
  })
}

/** Badge count for the notification bell — polls `?status=ACTIVE`. */
export function useActiveEmergencyCount() {
  const query = useEmergencies('ACTIVE')
  return { count: query.data?.length ?? 0, isLoading: query.isLoading }
}

export function useEmergency(id: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.emergencies.detail(id),
    queryFn: ({ signal }) => emergenciesApi.get(id, signal),
    enabled: useManagerOnly(enabled && Boolean(id)),
  })
}

export function useEmergencyAvailableTechnicians(id: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.emergencies.availableTechnicians(id),
    queryFn: ({ signal }) => emergenciesApi.availableTechnicians(id, signal),
    enabled: useManagerOnly(enabled && Boolean(id)),
  })
}

export function useReassignEmergency() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, newTechnicianId }: { id: string; newTechnicianId: string }) =>
      emergenciesApi.reassign(id, newTechnicianId),
    // Invalidate on settle: a 409 means someone else already resolved it, so refresh too.
    onSettled: () => invalidateEmergencies(queryClient),
  })
}

/** Technician self-report — open to any authenticated user. */
export function useReportEmergency() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: EmergencyCreateInput) => emergenciesApi.create(input),
    onSuccess: () => invalidateEmergencies(queryClient),
  })
}
