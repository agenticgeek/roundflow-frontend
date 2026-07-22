import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { setupApi } from '@/api/setup.api'
import type {
  RoundInput,
  ServiceAreaInput,
  ServiceInput,
  SetupStep9Input,
  SetupStep10Input,
  SetupStep11Input,
  TechnicianInput,
} from '@/api/types'
import type {
  SetupStep1Input,
  SetupStep2Input,
  SetupStep4Input,
} from '@/api/setup.api'
import { ROUTES } from '@/config/routes'
import { queryKeys } from '@/lib/query-keys'
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
    mutationFn: setupApi.saveStep5,
    onSuccess: invalidate,
  })
}

export function useSetupStep6(enabled = true) {
  return useQuery({
    queryKey: queryKeys.setup.step(6),
    queryFn: ({ signal }) => setupApi.getStep6(signal),
    enabled,
  })
}

export function useSaveStep6() {
  const invalidate = useInvalidateSetupStep(6)
  return useMutation({
    mutationFn: (input: TechnicianInput[]) => setupApi.saveStep6(input),
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

export function useSaveStep8() {
  const invalidate = useInvalidateSetupStep(8)
  return useMutation({
    mutationFn: (input: RoundInput) => setupApi.saveStep8(input),
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

export function useSetupStep10(enabled = true) {
  return useQuery({
    queryKey: queryKeys.setup.step(10),
    queryFn: ({ signal }) => setupApi.getStep10(signal),
    enabled,
  })
}

export function useSaveStep10() {
  const invalidate = useInvalidateSetupStep(10)
  return useMutation({
    mutationFn: (input: SetupStep10Input) => setupApi.saveStep10(input),
    onSuccess: invalidate,
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

export function useSetupStep12(enabled = true) {
  return useQuery({
    queryKey: queryKeys.setup.step(12),
    queryFn: ({ signal }) => setupApi.getStep12(signal),
    enabled,
  })
}

export function useCompleteSetup() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  return useMutation({
    mutationFn: setupApi.complete,
    onSuccess: async () => {
      clearSetupDeferred()
      await queryClient.invalidateQueries({ queryKey: queryKeys.setup.status })
      navigate(ROUTES.dashboard, { replace: true })
    },
  })
}
