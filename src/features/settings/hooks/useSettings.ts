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
import {
  invalidateBusinessSettings,
  queryKeys,
} from '@/lib/query-keys'

// GET /settings/* works before setup is complete (only writes are gated), so reads aren't gated here.

export function useBusinessProfile() {
  return useQuery({
    queryKey: queryKeys.settings.businessProfile,
    queryFn: ({ signal }) => settingsApi.getBusinessProfile(signal),
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
  return useQuery({
    queryKey: queryKeys.settings.roundSettings,
    queryFn: ({ signal }) => settingsApi.getRoundSettings(signal),
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
  return useQuery({
    queryKey: queryKeys.settings.payment,
    queryFn: ({ signal }) => settingsApi.getPayment(signal),
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

/** Connection changes show in Settings → Payment and in the setup wizard's Payments step. */
function invalidatePaymentConnections(queryClient: ReturnType<typeof useQueryClient>) {
  return Promise.all([
    invalidateBusinessSettings(queryClient),
    queryClient.invalidateQueries({ queryKey: queryKeys.setup.step(2) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.setup.status }),
  ])
}

export function useConnectGoCardless() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { accessToken: string; environment: 'sandbox' | 'live' }) =>
      settingsApi.connectGoCardless(input),
    onSuccess: () => invalidatePaymentConnections(queryClient),
  })
}

export function useDisconnectPayment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (provider: 'gocardless' | 'stripe') =>
      provider === 'stripe' ? settingsApi.disconnectStripe() : settingsApi.disconnectGoCardless(),
    onSuccess: () => invalidatePaymentConnections(queryClient),
  })
}

export function useSaveGoCardlessWebhookSecret() {
  return useMutation({
    mutationFn: (secret: string) => settingsApi.saveGoCardlessWebhookSecret(secret),
  })
}

export function useServices() {
  return useQuery({
    queryKey: queryKeys.settings.services,
    queryFn: ({ signal }) => settingsApi.getServices(signal),
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
  return useQuery({
    queryKey: queryKeys.settings.serviceAreas,
    queryFn: ({ signal }) => settingsApi.getServiceAreas(signal),
    enabled,
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
  return useQuery({
    queryKey: queryKeys.settings.technicians,
    queryFn: ({ signal }) => settingsApi.getTechnicians(signal),
    enabled,
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

export function useUpdateMessageTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: string }) =>
      settingsApi.updateMessageTemplate(id, { body }),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.settings.messageTemplates }),
        queryClient.invalidateQueries({ queryKey: queryKeys.setup.step(5) }),
      ]),
  })
}

export function useMessageTemplates() {
  return useQuery({
    queryKey: queryKeys.settings.messageTemplates,
    queryFn: ({ signal }) => settingsApi.getMessageTemplates(signal),
  })
}
