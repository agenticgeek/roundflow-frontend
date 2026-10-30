import { api } from '@/api/client'
import type { components, paths } from '@/api/types.gen'
import type {
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
    api<PropertyUpdateResult>(`/properties/${id}`, jsonRequest('PATCH', input)),

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
