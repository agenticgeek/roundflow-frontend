import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { settingsApi } from '@/api/settings.api'
import type {
  BusinessProfilePatch,
  PaymentSettingsPatch,
  RoundSettingsPatch,
} from '@/api/settings.api'
import type {
  ServiceAreaInput,
  ServiceInput,
  TechnicianInput,
} from '@/api/types'
import { useSetupStatus } from '@/features/setup/hooks/useSetup'
import { isSetupGateBypassed } from '@/lib/env'
import {
  invalidateBusinessSettings,
  queryKeys,
} from '@/lib/query-keys'

function useSettingsEnabled() {
  const status = useSetupStatus()
  return status.data?.setupCompleted === true || isSetupGateBypassed()
}

export function useBusinessProfile() {
  const enabled = useSettingsEnabled()
  return useQuery({
    queryKey: queryKeys.settings.businessProfile,
    queryFn: ({ signal }) => settingsApi.getBusinessProfile(signal),
    enabled,
  })
}

export function useUpdateBusinessProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: BusinessProfilePatch) =>
      settingsApi.updateBusinessProfile(input),
    onSuccess: () => invalidateBusinessSettings(queryClient),
  })
}

export function useRoundSettings() {
  const enabled = useSettingsEnabled()
  return useQuery({
    queryKey: queryKeys.settings.roundSettings,
    queryFn: ({ signal }) => settingsApi.getRoundSettings(signal),
    enabled,
  })
}

export function useUpdateRoundSettings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: RoundSettingsPatch) =>
      settingsApi.updateRoundSettings(input),
    onSuccess: () => invalidateBusinessSettings(queryClient),
  })
}

export function usePaymentSettings() {
  const enabled = useSettingsEnabled()
  return useQuery({
    queryKey: queryKeys.settings.payment,
    queryFn: ({ signal }) => settingsApi.getPayment(signal),
    enabled,
  })
}

export function useUpdatePaymentSettings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: PaymentSettingsPatch) =>
      settingsApi.updatePayment(input),
    onSuccess: () => invalidateBusinessSettings(queryClient),
  })
}

export function useConnectPayment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (provider: 'gocardless' | 'stripe') =>
      settingsApi.connectPayment(provider),
    onSuccess: () => invalidateBusinessSettings(queryClient),
  })
}

export function useServices() {
  const enabled = useSettingsEnabled()
  return useQuery({
    queryKey: queryKeys.settings.services,
    queryFn: ({ signal }) => settingsApi.getServices(signal),
    enabled,
  })
}

export function useCreateService() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: ServiceInput) => settingsApi.createService(input),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.services }),
  })
}

export function useUpdateService() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string
      input: Partial<ServiceInput>
    }) => settingsApi.updateService(id, input),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.services }),
  })
}

export function useDeleteService() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => settingsApi.deleteService(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.services }),
  })
}

export function useServiceAreas(enabled = true) {
  const settingsEnabled = useSettingsEnabled()
  return useQuery({
    queryKey: queryKeys.settings.serviceAreas,
    queryFn: ({ signal }) => settingsApi.getServiceAreas(signal),
    enabled: settingsEnabled && enabled,
  })
}

export function useCreateServiceArea() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: ServiceAreaInput) =>
      settingsApi.createServiceArea(input),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.settings.serviceAreas,
      }),
  })
}

export function useUpdateServiceArea() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string
      input: Partial<ServiceAreaInput>
    }) => settingsApi.updateServiceArea(id, input),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.settings.serviceAreas,
      }),
  })
}

export function useDeleteServiceArea() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => settingsApi.deleteServiceArea(id),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.settings.serviceAreas,
      }),
  })
}

export function useTechnicians(enabled = true) {
  const settingsEnabled = useSettingsEnabled()
  return useQuery({
    queryKey: queryKeys.settings.technicians,
    queryFn: ({ signal }) => settingsApi.getTechnicians(signal),
    enabled: settingsEnabled && enabled,
  })
}

export function useCreateTechnician() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: TechnicianInput) =>
      settingsApi.createTechnician(input),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.settings.technicians,
      }),
  })
}

export function useUpdateTechnician() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: TechnicianInput }) =>
      settingsApi.updateTechnician(id, input),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.settings.technicians,
      }),
  })
}

export function useDeleteTechnician() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => settingsApi.deleteTechnician(id),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.settings.technicians,
      }),
  })
}

export function useMessageTemplates() {
  const enabled = useSettingsEnabled()
  return useQuery({
    queryKey: queryKeys.settings.messageTemplates,
    queryFn: ({ signal }) => settingsApi.getMessageTemplates(signal),
    enabled,
  })
}
