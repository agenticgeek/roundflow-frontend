import { api } from '@/api/client'
import { apiBaseUrl } from '@/lib/env'
import { getCachedAccessToken } from '@/lib/supabase'
import type { components } from '@/api/types.gen'
import type { BankDetailsPayload } from '@/lib/bank-details'
import type {
  BusinessSettings,
  PaymentConnectResponse,
  Service,
  ServiceArea,
  ServiceAreaInput,
  ServiceInput,
  Technician,
  TechnicianInput,
} from '@/api/types'

// CONTRACT-DIFF: `bankDetails` isn't in the generated business-profile input schema yet.
// Per the Bank Details handoff: omit to leave unchanged, `null` to clear, an object to save/overwrite.
export type BusinessProfilePatch = components['schemas']['BusinessProfileUpdateInput'] & {
  bankDetails?: BankDetailsPayload | null
}
export type RoundSettingsPatch = components['schemas']['RoundSettingsUpdateInput']
export type PaymentSettingsPatch = components['schemas']['PaymentRulesUpdateInput']
export type MessageTemplateView = components['schemas']['MessageTemplateView']

// CONTRACT-DIFF: the generated connect response has no `webhookUrl`; GoCardless returns one —
// the endpoint the admin adds in their GoCardless dashboard (Developers → Webhooks).
export type GoCardlessConnectResponse = PaymentConnectResponse & { webhookUrl?: string | null }

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
  // Stripe uses a real OAuth redirect: the browser navigates to this endpoint,
  // which 302s to Stripe and sends the user back to the configured callback.
  // CAVEAT: this is a top-level navigation, so the bearer token can't ride in a
  // header — it's passed as a query param, which the authorize endpoint must
  // accept. Confirm with backend; otherwise this will 401.
  stripeAuthorizeUrl: (): string => {
    const url = `${apiBaseUrl()}/settings/stripe/authorize`
    const token = getCachedAccessToken()
    return token ? `${url}?access_token=${encodeURIComponent(token)}` : url
  },

  // GoCardless is token-based (not an OAuth redirect): the user pastes an access
  // token, we validate + store it server-side.
  connectGoCardless: (input: { accessToken: string; environment: 'sandbox' | 'live' }) =>
    api<GoCardlessConnectResponse>(
      '/settings/payment/gocardless/connect',
      jsonRequest('POST', input),
    ),

  // Payments hardening handoff (2026-10-22): the secret GoCardless shows when the admin adds
  // our webhook URL in their dashboard. Until it's saved, GoCardless webhooks are ignored.
  // 409 = GoCardless not connected; 400 = empty secret.
  disconnectStripe: () =>
    api<{ status: 'disconnected' }>('/settings/stripe/disconnect', jsonRequest('POST')),

  // Also clears the saved webhook secret server-side — reconnecting needs the secret again.
  disconnectGoCardless: () =>
    api<{ status: 'disconnected' }>(
      '/settings/payment/gocardless/disconnect',
      jsonRequest('POST'),
    ),

  saveGoCardlessWebhookSecret: (secret: string) =>
    api<{ status: 'saved' }>(
      '/settings/payment/gocardless/webhook-secret',
      jsonRequest('PATCH', { secret }),
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

  // Real, DB-backed templates (new tenants are seeded with defaults). Writes need setup complete.
  getMessageTemplates: (signal?: AbortSignal) =>
    api<MessageTemplateView[]>('/settings/message-templates', { signal }),
  updateMessageTemplate: (
    id: string,
    input: { name?: string; channel?: MessageTemplateView['channel']; body?: string; subject?: string | null },
  ) =>
    api<MessageTemplateView>(`/settings/message-templates/${id}`, jsonRequest('PATCH', input)),
}
