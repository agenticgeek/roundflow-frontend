import { api } from '@/api/client'
import type { components } from '@/api/types.gen'
import type {
  BusinessSettings,
  DeferredStatus,
  Round,
  RoundInput,
  Service,
  ServiceArea,
  ServiceAreaInput,
  ServiceInput,
  SetupStatus,
  SetupStep9Bundle,
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

export type SetupStep1Input = components['schemas']['BusinessProfileInput']
export type SetupStep2Input = components['schemas']['PaymentSetupInput']
export type SetupStep4Input = components['schemas']['RoundSettingsInput']
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
    api<DeferredStatus>('/setup/step/5', { signal }),
  saveStep5: () =>
    api<DeferredStatus>('/setup/step/5', jsonPost()),

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

  // CONTRACT-DIFF: steps 9–12 not yet in generated OpenAPI.
  getStep9: (signal?: AbortSignal) =>
    api<SetupStep9Bundle[]>('/setup/step/9', { signal }),
  saveStep9: (input: SetupStep9Input) =>
    api<SetupStep9Bundle>('/setup/step/9', jsonPost(input)),

  getStep10: (signal?: AbortSignal) =>
    api<SetupStep10Result>('/setup/step/10', { signal }),
  saveStep10: (input: SetupStep10Input) =>
    api<SetupStep10Result>('/setup/step/10', jsonPost(input)),

  getStep11: (signal?: AbortSignal) =>
    api<SetupStep11Status>('/setup/step/11', { signal }),
  saveStep11: (input: SetupStep11Input) =>
    api<SetupStep11Result>('/setup/step/11', jsonPost(input)),

  getStep12: (signal?: AbortSignal) =>
    api<SetupStep12Result>('/setup/step/12', { signal }),

  complete: () =>
    api<SetupStatus>('/setup/complete', jsonPost()),
}
