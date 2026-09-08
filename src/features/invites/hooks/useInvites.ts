import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  invitesApi,
  type InviteAcceptInput,
  type InviteCreateInput,
} from '@/api/invites.api'
import { invalidateTechnicians, queryKeys } from '@/lib/query-keys'

export function useInvitePreview(token: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.invites.preview(token),
    queryFn: ({ signal }) => invitesApi.getByToken(token, signal),
    enabled: enabled && Boolean(token),
    retry: false,
  })
}

export function useCreateInvite() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: InviteCreateInput) => invitesApi.create(input),
    onSuccess: (_data, input) => {
      void invalidateTechnicians(queryClient)
      if (input.technicianId) {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.technicians.detail(input.technicianId),
        })
      }
    },
  })
}

export function useAcceptInvite() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      token,
      input,
      accessToken,
    }: {
      token: string
      input: InviteAcceptInput
      accessToken?: string
    }) => invitesApi.accept(token, input, accessToken),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.auth.me })
      void queryClient.invalidateQueries({ queryKey: queryKeys.setup.status })
      void invalidateTechnicians(queryClient)
    },
  })
}
