import { api } from '@/api/client'
import type { components, paths } from '@/api/types.gen'
import type {
  CleaningFrequency,
  LifecycleStatus,
  PaymentMethod,
  NoteCreateInput,
  PauseServiceInput,
  PropertyCreateInput,
  PropertyCreateResult,
  PropertyNote,
  PropertyUpdateInput,
} from '@/api/types'

/** PATCH /properties/:id — the Property plus where a frequency change moved it (B3 · GAP-018). */
export type PropertyUpdateResult = components['schemas']['PropertyUpdateResult']
/** POST …/pause — the plan plus `cancelledVisits` and `pauseScheduled` (A4 · GAP-020). */
export type PauseResult = components['schemas']['PauseResult']
export type ServicePlan = components['schemas']['ServicePlan']
/** GET /properties/:id/notes — pinned access/risk entries first, then the notes (GAP-022). */
export type PropertyNotesListItem =
  paths['/properties/{id}/notes']['get']['responses'][200]['content']['application/json'][number]
export type PinnedNote = components['schemas']['PinnedNote']

/** BUG-08 — PUT /properties/:id/services. CONTRACT-DIFF: not in the generated OpenAPI yet. */
export type PropertyServicesInput = { serviceIds: string[]; prices?: Record<string, number> }
export type PropertyServicePlanRow = {
  servicePlanId: string
  serviceId: string | null
  serviceName: string | null
  price: number | null
  status?: string
}
export type PropertyServicesResult = {
  propertyId: string
  servicePlans: PropertyServicePlanRow[]
  totalPrice: number
  added: string[]
  removed: string[]
  cancelledVisits: number
}
export type ServiceSnapshot = { servicePlanId: string; serviceId: string | null; serviceName: string | null; price: number | null }
export type PropertyServicesHistoryRow = {
  id: string
  changedAt: string
  actorId: string | null
  actorRole: string | null
  oldServices: ServiceSnapshot[]
  newServices: ServiceSnapshot[]
  added: string[]
  removed: string[]
}
export type PropertyServicesHistory = {
  rows: PropertyServicesHistoryRow[]
  pagination: { page: number; pageSize: number; total: number; totalPages: number }
}

/** GET /properties/:id (CONTRACT-DIFF: not in the generated OpenAPI yet). */
export type PropertyDetailResponse = {
  id: string
  customerId: string
  propertyName: string | null
  addressLine: string
  postcode: string
  propertyType: string | null
  status: 'ACTIVE' | 'CANCELLED'
  accessNotes: string | null
  riskNotes: string | null
  serviceAreaId: string | null
  serviceAreaName: string | null
  roundId: string | null
  roundName: string | null
  assignedTechnicianId: string | null
  assignedTechnicianName: string | null
  customer: {
    id: string
    name: string
    phone: string | null
    landline: string | null
    email: string | null
    status: string
    paymentMethod: string | null
    badDebt: boolean
  }
  servicePlans: {
    id: string
    serviceId: string | null
    serviceName: string | null
    price: number | null
    cleanMethod: string | null
    paymentMethod: PaymentMethod | null
    cleaningFrequency: CleaningFrequency | null
    status: LifecycleStatus
    nextDueDate: string | null
    lastCompleted: string | null
    pauseStartDate: string | null
    pauseEndDate: string | null
    isPrimary: boolean
  }[]
  pause: { state: 'NONE' | 'PAUSED' | 'SCHEDULED'; pauseStartDate: string | null; pauseEndDate: string | null }
  paymentStatus: string
  amountDue: number
  nextVisit: { id: string; date: string; status: string; technicianName: string | null; paymentHold: boolean } | null
}

function jsonRequest(method: 'POST' | 'PATCH' | 'PUT', body?: unknown): RequestInit {
  return {
    method,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  }
}

export const propertiesApi = {
  get: (id: string, signal?: AbortSignal) => api<PropertyDetailResponse>(`/properties/${id}`, { signal }),

  createProperty: (input: PropertyCreateInput) =>
    api<PropertyCreateResult>('/properties', jsonRequest('POST', input)),

  updateProperty: (id: string, input: PropertyUpdateInput) =>
    api<PropertyUpdateResult>(`/properties/${id}`, jsonRequest('PATCH', input)),

  setServices: (id: string, input: PropertyServicesInput) =>
    api<PropertyServicesResult>(`/properties/${id}/services`, jsonRequest('PUT', input)),

  servicesHistory: (id: string, page = 1, signal?: AbortSignal) =>
    api<PropertyServicesHistory>(`/properties/${id}/services/history?page=${page}`, { signal }),

  pause: (id: string, input: PauseServiceInput) =>
    api<PauseResult>(`/properties/${id}/pause`, jsonRequest('POST', input)),

  resume: (id: string) =>
    api<ServicePlan>(`/properties/${id}/resume`, jsonRequest('POST')),

  listNotes: (id: string, signal?: AbortSignal) =>
    api<PropertyNotesListItem[]>(`/properties/${id}/notes`, { signal }),

  addNote: (id: string, input: NoteCreateInput) =>
    api<PropertyNote>(`/properties/${id}/notes`, jsonRequest('POST', input)),

  // CONTRACT-DIFF: soft-delete property; handoff has DELETE, OpenAPI may lag.
  remove: (id: string) => api<void>(`/properties/${id}`, { method: 'DELETE' }),
}
