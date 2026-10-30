import { api } from '@/api/client'
import type { components } from '@/api/types.gen'
import type {
  BusinessSettings,
  Round,
  RoundInput,
  Service,
  ServiceArea,
  ServiceAreaInput,
  ServiceInput,
  SetupStatus,
  SetupStep9Bundle,
  SetupStep9BulkInput,
  SetupStep9Input,
  SetupStep10Input,
  SetupStep10Result,
  SetupStep11Input,
  SetupStep11Result,
  SetupStep11Status,
  SetupStep12Result,
  Technician,
  TechnicianInput,
} from '@/api/types'

/** GAP-001: the address (line 1/2, town, postcode) and `vatRate` (a number) are stored. */
export type SetupStep1Input = components['schemas']['BusinessProfileInput']
/**
 * A6: `gocardlessConnected` / `stripeConnected` are no longer accepted (400 FIELD_REMOVED) —
 * connections come from the real provider flows. Omitted here so they can't be sent.
 */
export type SetupStep2Input = Omit<
  components['schemas']['PaymentSetupInput'],
  'gocardlessConnected' | 'stripeConnected'
>
export type SetupStep4Input = components['schemas']['RoundSettingsInput']
/**
 * One property for POST /setup/step/9. `roundId` stays optional ("Leave unassigned"); GAP-010
 * adds `customerId` (attach to an existing customer) and `lastCleanedDate`.
 */
export type SetupStep9PropertyInput = SetupStep9Input &
  Pick<components['schemas']['SetupPropertyInput'], 'customerId' | 'lastCleanedDate'>
/** `customerMatched`: the property went onto an existing customer (picked, or same mobile/email). */
export type SetupStep9SaveResult = SetupStep9Bundle & { customerMatched?: boolean }
/** GAP-009: row errors are `{ row, field, error }` (`message` is the deprecated copy). */
export type SetupStep9BulkResult = components['schemas']['BulkSetupPropertyResult']
export type SetupStep9BulkRowError = components['schemas']['SetupPropertyRowError']
/** GAP-016: the visits activation would create, per round, from the same planner. */
export type ActivationPreview = components['schemas']['ActivationPreview']
export type SetupStep5Input = components['schemas']['MessageTemplateInput']
export type SetupStep5Template = components['schemas']['MessageTemplateView']
export type {
  SetupStep9Input,
  SetupStep10Input,
  SetupStep11Input,
} from '@/api/types'

function jsonPost(body?: unknown): RequestInit {
  return {
    method: 'POST',
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  }
}

export const setupApi = {
  getStatus: (signal?: AbortSignal) =>
    api<SetupStatus>('/setup/status', { signal }),

  getStep1: (signal?: AbortSignal) =>
    api<BusinessSettings | null>('/setup/step/1', { signal }),
  saveStep1: (input: SetupStep1Input) =>
    api<BusinessSettings>('/setup/step/1', jsonPost(input)),

  getStep2: (signal?: AbortSignal) =>
    api<BusinessSettings | null>('/setup/step/2', { signal }),
  saveStep2: (input: SetupStep2Input) =>
    api<BusinessSettings>('/setup/step/2', jsonPost(input)),

  getStep3: (signal?: AbortSignal) =>
    api<Service[]>('/setup/step/3', { signal }),
  saveStep3: (services: ServiceInput[]) =>
    api<Service[]>('/setup/step/3', jsonPost({ services })),

  getStep4: (signal?: AbortSignal) =>
    api<BusinessSettings | null>('/setup/step/4', { signal }),
  saveStep4: (input: SetupStep4Input) =>
    api<BusinessSettings>('/setup/step/4', jsonPost(input)),

  getStep5: (signal?: AbortSignal) =>
    api<SetupStep5Template[]>('/setup/step/5', { signal }),
  /** Bulk replace — the sent list becomes the full template set. */
  saveStep5: (templates: SetupStep5Input[]) =>
    api<SetupStep5Template[]>('/setup/step/5', jsonPost({ templates })),

  getStep6: (signal?: AbortSignal) =>
    api<Technician[]>('/setup/step/6', { signal }),
  saveStep6: (technicians: TechnicianInput[]) =>
    api<Technician[]>('/setup/step/6', jsonPost({ technicians })),

  getStep7: (signal?: AbortSignal) =>
    api<ServiceArea[]>('/setup/step/7', { signal }),
  saveStep7: (serviceAreas: ServiceAreaInput[]) =>
    api<ServiceArea[]>('/setup/step/7', jsonPost({ serviceAreas })),

  getStep8: (signal?: AbortSignal) =>
    api<Round[]>('/setup/step/8', { signal }),
  saveStep8: (input: RoundInput) =>
    api<Round>('/setup/step/8', jsonPost(input)),

  getStep9: (signal?: AbortSignal) =>
    api<SetupStep9Bundle[]>('/setup/step/9', { signal }),
  saveStep9: (input: SetupStep9PropertyInput) =>
    api<SetupStep9SaveResult>('/setup/step/9', jsonPost(input)),
  // All-or-nothing validation up front (400, nothing inserted); then inserted in batches of
  // 100, each in its own transaction — a later batch failing (500) keeps earlier batches.
  saveStep9Bulk: (input: SetupStep9BulkInput) =>
    api<SetupStep9BulkResult>('/setup/step/9/bulk', jsonPost(input)),

  getStep10: (signal?: AbortSignal) =>
    api<SetupStep10Result>('/setup/step/10', { signal }),
  saveStep10: (input: SetupStep10Input) =>
    api<SetupStep10Result>('/setup/step/10', jsonPost(input)),

  getStep11: (signal?: AbortSignal) =>
    api<SetupStep11Status>('/setup/step/11', { signal }),
  getStep11Preview: (params: { startDate: string; cycleWeeks: number }, signal?: AbortSignal) =>
    api<ActivationPreview>(
      `/setup/step/11/preview?${new URLSearchParams({
        startDate: params.startDate,
        cycleWeeks: String(params.cycleWeeks),
      }).toString()}`,
      { signal },
    ),
  saveStep11: (input: SetupStep11Input) =>
    api<SetupStep11Result>('/setup/step/11', jsonPost(input)),

  getStep12: (signal?: AbortSignal) =>
    api<SetupStep12Result>('/setup/step/12', { signal }),

  complete: () =>
    api<SetupStatus>('/setup/complete', jsonPost()),
}
