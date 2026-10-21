import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { setupApi } from '@/api/setup.api'
import { roundsApi, type RoundCreateInput, type RoundUpdateInput } from '@/api/rounds.api'
import {
  techniciansApi,
  type TechnicianCreateInput,
  type TechnicianUpdateInput,
} from '@/api/technicians.api'
import { invitesApi, type InviteCreateInput } from '@/api/invites.api'
import type {
  ServiceAreaInput,
  ServiceInput,
  SetupStep9BulkInput,
  SetupStep9Input,
  SetupStep11Input,
} from '@/api/types'
import type {
  SetupStep1Input,
  SetupStep2Input,
  SetupStep4Input,
} from '@/api/setup.api'
import { invalidateRounds, invalidateTechnicians, queryKeys } from '@/lib/query-keys'
import { clearSetupDeferred } from '@/lib/setup-deferred'

export function useSetupStatus(enabled = true) {
  return useQuery({
    queryKey: queryKeys.setup.status,
    queryFn: ({ signal }) => setupApi.getStatus(signal),
    // Prefer mutation invalidation over focus refetch — tab switches must not
    // hammer GET /setup/status (and paired bootstrap observers).
    enabled,
  })
}

function useInvalidateSetupStep(step: number) {
  const queryClient = useQueryClient()
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.setup.status }),
      queryClient.invalidateQueries({ queryKey: queryKeys.setup.step(step) }),
    ])
}

export function useSetupStep1(enabled = true) {
  return useQuery({
    queryKey: queryKeys.setup.step(1),
    queryFn: ({ signal }) => setupApi.getStep1(signal),
    enabled,
  })
}

export function useSaveStep1() {
  const invalidate = useInvalidateSetupStep(1)
  return useMutation({
    mutationFn: (input: SetupStep1Input) => setupApi.saveStep1(input),
    onSuccess: invalidate,
  })
}

export function useSetupStep2(enabled = true) {
  return useQuery({
    queryKey: queryKeys.setup.step(2),
    queryFn: ({ signal }) => setupApi.getStep2(signal),
    enabled,
  })
}

export function useSaveStep2() {
  const invalidate = useInvalidateSetupStep(2)
  return useMutation({
    mutationFn: (input: SetupStep2Input) => setupApi.saveStep2(input),
    onSuccess: invalidate,
  })
}

export function useSetupStep3(enabled = true) {
  return useQuery({
    queryKey: queryKeys.setup.step(3),
    queryFn: ({ signal }) => setupApi.getStep3(signal),
    enabled,
  })
}

export function useSaveStep3() {
  const invalidate = useInvalidateSetupStep(3)
  return useMutation({
    mutationFn: (input: ServiceInput[]) => setupApi.saveStep3(input),
    onSuccess: invalidate,
  })
}

export function useSetupStep4(enabled = true) {
  return useQuery({
    queryKey: queryKeys.setup.step(4),
    queryFn: ({ signal }) => setupApi.getStep4(signal),
    enabled,
  })
}

export function useSaveStep4() {
  const invalidate = useInvalidateSetupStep(4)
  return useMutation({
    mutationFn: (input: SetupStep4Input) => setupApi.saveStep4(input),
    onSuccess: invalidate,
  })
}

export function useSetupStep5(enabled = true) {
  return useQuery({
    queryKey: queryKeys.setup.step(5),
    queryFn: ({ signal }) => setupApi.getStep5(signal),
    enabled,
  })
}

export function useSaveStep5() {
  const invalidate = useInvalidateSetupStep(5)
  return useMutation({
    mutationFn: (templates: Parameters<typeof setupApi.saveStep5>[0]) =>
      setupApi.saveStep5(templates),
    onSuccess: invalidate,
  })
}

export function useSetupStep7(enabled = true) {
  return useQuery({
    queryKey: queryKeys.setup.step(7),
    queryFn: ({ signal }) => setupApi.getStep7(signal),
    enabled,
  })
}

export function useSaveStep7() {
  const invalidate = useInvalidateSetupStep(7)
  return useMutation({
    mutationFn: (input: ServiceAreaInput[]) => setupApi.saveStep7(input),
    onSuccess: invalidate,
  })
}

export function useSetupStep8(enabled = true) {
  return useQuery({
    queryKey: queryKeys.setup.step(8),
    queryFn: ({ signal }) => setupApi.getStep8(signal),
    enabled,
  })
}

/** After any round change: step 8 lists rounds, step 7 counts them per area, and later steps pick from them. */
function useInvalidateSetupRounds() {
  const queryClient = useQueryClient()
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.setup.status }),
      ...[7, 8, 9, 10, 11].map((step) =>
        queryClient.invalidateQueries({ queryKey: queryKeys.setup.step(step) }),
      ),
      invalidateRounds(queryClient),
    ])
}

/**
 * Adds a round from the Rounds step. POST /setup/step/8 only upserts a single setup round,
 * so it's used for the first round (it also marks the step complete); later rounds go
 * through POST /rounds.
 */
export function useCreateSetupRound() {
  const invalidate = useInvalidateSetupRounds()
  return useMutation({
    mutationFn: ({
      input,
      isFirst,
    }: {
      input: RoundCreateInput
      isFirst: boolean
    }): Promise<{ id?: string }> =>
      isFirst
        ? setupApi.saveStep8({ ...input, defaultDay: input.defaultDay ?? undefined })
        : roundsApi.create(input),
    onSuccess: invalidate,
  })
}

export function useUpdateSetupRound() {
  const invalidate = useInvalidateSetupRounds()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: RoundUpdateInput }) =>
      roundsApi.update(id, input),
    onSuccess: invalidate,
  })
}

/**
 * After any technician change: step 6/10 read technicians, and step completion is derived
 * server-side. The Technicians step saves through /technicians, never the step 6 bulk
 * replace (which would wipe invite-pending technicians added this way).
 */
function useInvalidateSetupTechnicians() {
  const queryClient = useQueryClient()
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.setup.status }),
      queryClient.invalidateQueries({ queryKey: queryKeys.setup.step(6) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.setup.step(10) }),
      invalidateTechnicians(queryClient),
    ])
}

export function useCreateSetupTechnician() {
  const invalidate = useInvalidateSetupTechnicians()
  return useMutation({
    mutationFn: (input: TechnicianCreateInput) => techniciansApi.create(input),
    onSuccess: invalidate,
  })
}

export function useUpdateSetupTechnician() {
  const invalidate = useInvalidateSetupTechnicians()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: TechnicianUpdateInput }) =>
      techniciansApi.update(id, input),
    onSuccess: invalidate,
  })
}

export function useSendSetupTechnicianInvite() {
  const invalidate = useInvalidateSetupTechnicians()
  return useMutation({
    mutationFn: (input: InviteCreateInput) => invitesApi.create(input),
    onSuccess: invalidate,
  })
}

export function useSetupStep9(enabled = true) {
  return useQuery({
    queryKey: queryKeys.setup.step(9),
    queryFn: ({ signal }) => setupApi.getStep9(signal),
    enabled,
  })
}

export function useSaveStep9() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: SetupStep9Input) => setupApi.saveStep9(input),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.setup.status }),
        queryClient.invalidateQueries({ queryKey: queryKeys.setup.step(9) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.setup.step(10) }),
      ]),
  })
}

export function useSaveStep9Bulk() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: SetupStep9BulkInput) => setupApi.saveStep9Bulk(input),
    // The import panel reports every failure itself (per-row 400s, partial 5xx).
    meta: { silenceGlobalError: true },
    // Refresh even on failure: a mid-import batch error (500) still leaves earlier
    // batches committed, so the "Added properties" list must reflect them.
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.setup.status }),
        queryClient.invalidateQueries({ queryKey: queryKeys.setup.step(9) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.setup.step(10) }),
      ]),
  })
}

export function useSetupStep11(enabled = true) {
  return useQuery({
    queryKey: queryKeys.setup.step(11),
    queryFn: ({ signal }) => setupApi.getStep11(signal),
    enabled,
  })
}

export function useSaveStep11() {
  const invalidate = useInvalidateSetupStep(11)
  return useMutation({
    mutationFn: (input: SetupStep11Input) => setupApi.saveStep11(input),
    onSuccess: invalidate,
  })
}

export function useCompleteSetup() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: setupApi.complete,
    onSuccess: async () => {
      clearSetupDeferred()
      await queryClient.invalidateQueries({ queryKey: queryKeys.setup.status })
    },
  })
}
