import { api } from '@/api/client'
import type {
  NoteCreateInput,
  PauseServiceInput,
  Property,
  PropertyCreateInput,
  PropertyCreateResult,
  PropertyNote,
  PropertyUpdateInput,
  ServicePlanView,
} from '@/api/types'

function jsonRequest(method: 'POST' | 'PATCH', body?: unknown): RequestInit {
  return {
    method,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  }
}

export const propertiesApi = {
  createProperty: (input: PropertyCreateInput) =>
    api<PropertyCreateResult>('/properties', jsonRequest('POST', input)),

  updateProperty: (id: string, input: PropertyUpdateInput) =>
    api<Property>(`/properties/${id}`, jsonRequest('PATCH', input)),

  pause: (id: string, input: PauseServiceInput) =>
    api<ServicePlanView>(`/properties/${id}/pause`, jsonRequest('POST', input)),

  resume: (id: string) =>
    api<ServicePlanView>(`/properties/${id}/resume`, jsonRequest('POST')),

  listNotes: (id: string, signal?: AbortSignal) =>
    api<PropertyNote[]>(`/properties/${id}/notes`, { signal }),

  addNote: (id: string, input: NoteCreateInput) =>
    api<PropertyNote>(`/properties/${id}/notes`, jsonRequest('POST', input)),

  // CONTRACT-DIFF: soft-delete property; handoff has DELETE, OpenAPI may lag.
  remove: (id: string) => api<void>(`/properties/${id}`, { method: 'DELETE' }),
}
