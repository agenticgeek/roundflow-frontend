import { api } from '@/api/client'
import type { components } from '@/api/types.gen'

export type VisitCreateInput = components['schemas']['VisitCreateInput']
export type Visit = components['schemas']['Visit']
export type VisitRescheduleResult = components['schemas']['VisitRescheduleResult']

function jsonRequest(method: 'POST' | 'PATCH', body?: unknown): RequestInit {
  return {
    method,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  }
}

/** PATCH /visits/:id/assign (CONTRACT-DIFF: not in the OpenAPI yet). `technicianId: null` unassigns. */
export type VisitAssignResult = {
  id: string
  status: string
  technicianId: string | null
  technicianName: string | null
  technicianOverride: boolean
}

export const visitsApi = {
  assign: (id: string, technicianId: string | null) =>
    api<VisitAssignResult>(`/visits/${encodeURIComponent(id)}/assign`, jsonRequest('PATCH', { technicianId })),

  /** Book a scheduled or skipped visit onto a new date (YYYY-MM-DD, today or later). */
  reschedule: (id: string, date: string) =>
    api<VisitRescheduleResult>(`/visits/${encodeURIComponent(id)}/reschedule`, jsonRequest('PATCH', { date })),

  /** Add One-off Job — pass `roundId` for the visit to appear in the Round Planner. */
  create: (input: VisitCreateInput) => api<Visit>('/visits', jsonRequest('POST', input)),
}
