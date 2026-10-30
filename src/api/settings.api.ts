import { api } from '@/api/client'
import { beginStripeConnect } from '@/lib/stripe-connect'
import type { components } from '@/api/types.gen'
import type {
  BusinessSettings,
  Service,
  ServiceArea,
  ServiceAreaInput,
  ServiceInput,
  Technician,
  TechnicianInput,
} from '@/api/types'

/** `bankDetails`: omit to leave unchanged, `null` to clear. GAP-001 adds the address + `vatRate`. */
export type BusinessProfilePatch = components['schemas']['BusinessProfileUpdateInput']
export type RoundSettingsPatch = components['schemas']['RoundSettingsUpdateInput']
export type PaymentSettingsPatch = components['schemas']['PaymentRulesUpdateInput']
export type MessageTemplateView = components['schemas']['MessageTemplateView']

/** `webhookUrl` is the endpoint the admin adds in their GoCardless dashboard (Developers → Webhooks). */
export type GoCardlessConnectResponse = components['schemas']['ProviderConnectResponse']

/** GoHighLevel private-integration connect (GAP-017): sub-account API key + location id. */
export type GhlPrivateConnectInput = components['schemas']['GhlPrivateConnectInput']
export type GhlConnectResponse = components['schemas']['ProviderConnectResponse']
/** GAP-017 part 2. `connectedAt` is always null for now (not stored). */
export type GhlStatus = components['schemas']['GhlStatus']
export type GhlTestResult = components['schemas']['GhlTestResult']
export type StripeCallbackResult = components['schemas']['StripeCallbackResult']
/** GAP-025: technician KPI alert thresholds. */
export type KpiThreshold = components['schemas']['KpiThreshold']
export type KpiThresholdInput = components['schemas']['KpiThresholdInput']

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
  // Stripe Connect OAuth (see lib/stripe-connect.ts): the consent URL is built client-side so no
  // token goes in a URL; Stripe returns to ROUTES.stripeCallback, which finishes the exchange here
  // with the bearer header. api() sends `Accept: application/json`, so the API answers
  // `200 { status: "connected", stripeConnectAccountId }`. An older API answers with a 302 back to
  // the app instead — `redirect: 'manual'` stops fetch following it cross-origin, and api() treats
  // the opaque redirect as success (resolves undefined).
  stripeAuthorizeUrl: (): string => beginStripeConnect(),
  completeStripeConnect: (code: string, state: string) =>
    api<StripeCallbackResult | undefined>(
      `/settings/stripe/callback?${new URLSearchParams({ code, state }).toString()}`,
      { redirect: 'manual' },
    ),

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

  // GoHighLevel messaging (GAP-017). All of these work before setup is complete. The private key
  // is verified against GHL before it's stored; a rejected key is a 400 with the reason.
  getGhlStatus: (signal?: AbortSignal) => api<GhlStatus>('/settings/ghl/status', { signal }),
  /** 409 GHL_NOT_CONNECTED · 502 GHL_SEND_FAILED (GHL rejected the stored token). */
  testGhl: () => api<GhlTestResult>('/settings/ghl/test', jsonRequest('POST')),
  /**
   * GHL OAuth consent URL, fetched with the bearer header (never a token in a URL). No
   * `redirectUri`: GHL returns to the API's public callback, which 302s back to
   * /settings/integrations?ghl=connected&webhookUrl=… (or ?ghl=error&message=…).
   */
  ghlAuthorizeUrl: () => api<{ url: string }>('/settings/ghl/authorize'),
  connectGhlPrivate: (input: GhlPrivateConnectInput) =>
    api<GhlConnectResponse>('/settings/ghl/connect-private', jsonRequest('POST', input)),
  disconnectGhl: () =>
    api<{ status: 'disconnected' }>('/settings/ghl/disconnect', jsonRequest('POST')),

  getKpiThresholds: (signal?: AbortSignal) =>
    api<KpiThreshold[]>('/settings/kpi-thresholds', { signal }),
  /** Replaces every threshold. 400 on a duplicate metric + operator. */
  saveKpiThresholds: (thresholds: KpiThresholdInput[]) =>
    api<KpiThreshold[]>('/settings/kpi-thresholds', { method: 'PUT', body: JSON.stringify(thresholds) }),

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
