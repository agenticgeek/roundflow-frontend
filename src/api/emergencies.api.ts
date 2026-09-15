import { api } from '@/api/client'

/** CONTRACT-DIFF: `/emergencies/*` not in generated OpenAPI yet — live per EMERGENCIES handoff. */

export type EmergencyStatus = 'ACTIVE' | 'RESOLVED'

export type EmergencyRow = {
  id: string
  technicianId: string
  technicianName: string
  roundId: string
  roundName: string
  remainingStops: number
  lastLocation: string | null
  scheduledWindowEnd: string | null
  notes: string | null
  status: EmergencyStatus
  assignedTechnicianId: string | null
  assignedTechnicianName: string | null
  resolvedAt: string | null
  reportedAt: string
}

export type EmergencyAvailability = 'AVAILABLE' | 'BUSY'

export type EmergencyAvailableTechnician = {
  technicianId: string
  technicianName: string
  avatarUrl: string | null
  jobsRemaining: number
  availability: EmergencyAvailability
}

export type EmergencyCreateInput = {
  technicianId: string
  roundId: string
  remainingStops: number
  lastLocation?: string | null
  scheduledWindowEnd?: string | null
  notes?: string | null
}

function jsonRequest(method: 'POST', body?: unknown): RequestInit {
  return {
    method,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  }
}

export const emergenciesApi = {
  /** Optional `status` filter; omit for all. */
  list: (status?: EmergencyStatus, signal?: AbortSignal) =>
    api<EmergencyRow[]>(`/emergencies${status ? `?status=${status}` : ''}`, { signal }),

  get: (id: string, signal?: AbortSignal) => api<EmergencyRow>(`/emergencies/${id}`, { signal }),

  availableTechnicians: (id: string, signal?: AbortSignal) =>
    api<EmergencyAvailableTechnician[]>(`/emergencies/${id}/available-technicians`, { signal }),

  /** Atomic: marks RESOLVED and bulk-reassigns the round's unfinished visits. */
  reassign: (id: string, newTechnicianId: string) =>
    api<EmergencyRow>(`/emergencies/${id}/reassign`, jsonRequest('POST', { newTechnicianId })),

  /** Technician self-report — open to any authenticated user. */
  create: (input: EmergencyCreateInput) => api<EmergencyRow>('/emergencies', jsonRequest('POST', input)),
}
