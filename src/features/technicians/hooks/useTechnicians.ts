import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  techniciansApi,
  type TechnicianCreateInput,
  type TechnicianUpdateInput,
} from '@/api/technicians.api'
import { useCreateInvite } from '@/features/invites/hooks/useInvites'
import { invalidateTechnicians, queryKeys } from '@/lib/query-keys'

export function useTechniciansList(enabled = true) {
  return useQuery({
    queryKey: queryKeys.technicians.list,
    queryFn: ({ signal }) => techniciansApi.list(signal),
    enabled,
  })
}

export function useTechnician(id: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.technicians.detail(id),
    queryFn: ({ signal }) => techniciansApi.get(id, signal),
    enabled: enabled && Boolean(id),
  })
}

export function useCreateTechnician() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: TechnicianCreateInput) => techniciansApi.create(input),
    onSuccess: () => invalidateTechnicians(queryClient),
  })
}

export function useUpdateTechnician() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: TechnicianUpdateInput }) =>
      techniciansApi.update(id, input),
    onSuccess: (_data, { id }) => {
      void invalidateTechnicians(queryClient)
      void queryClient.invalidateQueries({ queryKey: queryKeys.technicians.detail(id) })
    },
  })
}

/** Resend / standalone invite — POST /invites. */
export function useSendTechnicianInvite() {
  return useCreateInvite()
}
