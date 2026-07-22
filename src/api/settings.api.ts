import { api } from '@/api/client'
import type { components } from '@/api/types.gen'
import type {
  BusinessSettings,
  DeferredStatus,
  PaymentConnectResponse,
  Service,
  ServiceArea,
  ServiceAreaInput,
  ServiceInput,
  Technician,
  TechnicianInput,
} from '@/api/types'

export type BusinessProfilePatch = components['schemas']['BusinessProfileUpdateInput']
export type RoundSettingsPatch = components['schemas']['RoundSettingsUpdateInput']
export type PaymentSettingsPatch = components['schemas']['PaymentRulesUpdateInput']

function jsonRequest(method: 'POST' | 'PATCH', body?: unknown): RequestInit {
  return {
    method,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  }
}

export const settingsApi = {
  getBusinessProfile: (signal?: AbortSignal) =>
    api<BusinessSettings | null>('/settings/business-profile', { signal }),
  updateBusinessProfile: (input: BusinessProfilePatch) =>
    api<BusinessSettings>(
      '/settings/business-profile',
      jsonRequest('PATCH', input),
    ),

  getRoundSettings: (signal?: AbortSignal) =>
    api<BusinessSettings | null>('/settings/round-settings', { signal }),
  updateRoundSettings: (input: RoundSettingsPatch) =>
    api<BusinessSettings>(
      '/settings/round-settings',
      jsonRequest('PATCH', input),
    ),

  getPayment: (signal?: AbortSignal) =>
    api<BusinessSettings | null>('/settings/payment', { signal }),
  updatePayment: (input: PaymentSettingsPatch) =>
    api<BusinessSettings>('/settings/payment', jsonRequest('PATCH', input)),
  connectPayment: (provider: 'gocardless' | 'stripe') =>
    api<PaymentConnectResponse>(
      `/settings/payment/${provider}/connect`,
      jsonRequest('POST'),
    ),

  getServices: (signal?: AbortSignal) =>
    api<Service[]>('/settings/services', { signal }),
  createService: (input: ServiceInput) =>
    api<Service>('/settings/services', jsonRequest('POST', input)),
  updateService: (id: string, input: Partial<ServiceInput>) =>
    api<Service>(`/settings/services/${id}`, jsonRequest('PATCH', input)),
  deleteService: (id: string) =>
    api<void>(`/settings/services/${id}`, { method: 'DELETE' }),

  getServiceAreas: (signal?: AbortSignal) =>
    api<ServiceArea[]>('/settings/service-areas', { signal }),
  createServiceArea: (input: ServiceAreaInput) =>
    api<ServiceArea>('/settings/service-areas', jsonRequest('POST', input)),
  updateServiceArea: (id: string, input: Partial<ServiceAreaInput>) =>
    api<ServiceArea>(
      `/settings/service-areas/${id}`,
      jsonRequest('PATCH', input),
    ),
  deleteServiceArea: (id: string) =>
    api<void>(`/settings/service-areas/${id}`, { method: 'DELETE' }),

  getTechnicians: (signal?: AbortSignal) =>
    api<Technician[]>('/settings/technicians', { signal }),
  createTechnician: (input: TechnicianInput) =>
    api<Technician>('/settings/technicians', jsonRequest('POST', input)),
  updateTechnician: (id: string, input: TechnicianInput) =>
    api<Technician>(
      `/settings/technicians/${id}`,
      jsonRequest('PATCH', input),
    ),
  deleteTechnician: (id: string) =>
    api<void>(`/settings/technicians/${id}`, { method: 'DELETE' }),

  getMessageTemplates: (signal?: AbortSignal) =>
    api<DeferredStatus>('/settings/message-templates', { signal }),
}
