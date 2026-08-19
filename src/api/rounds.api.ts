import { api } from '@/api/client'
import type { CleaningFrequency, DayOfWeek } from '@/api/types'

export type RoundStatus = 'ACTIVE' | 'DRAFT' | 'ARCHIVED'

export interface RoundListItem {
  id: string
  name: string
  frequency: CleaningFrequency | null
  defaultDay: string | null
  status: RoundStatus
  serviceAreaId: string | null
  serviceAreaName: string | null
  technicianCount: number
  propertyCount: number
}

export interface RoundDetail {
  id: string
  name: string
  frequency: CleaningFrequency | null
  defaultDay: string | null
  description: string | null
  status: RoundStatus
  serviceAreaId: string | null
  serviceAreaName: string | null
  technicians: { id: string; name: string; active: boolean }[]
  propertyCount: number
}

export type RoundCreateInput = {
  name: string
  frequency: CleaningFrequency
  serviceAreaId: string
  defaultDay?: DayOfWeek | null
  description?: string | null
}

export type RoundUpdateInput = {
  name?: string
  frequency?: CleaningFrequency | null
  serviceAreaId?: string | null
  defaultDay?: DayOfWeek | null
  description?: string | null
  status?: RoundStatus
}

export type PlannerOccurrence = {
  date: string
  stopCount: number
  totalValue: number
  completedCount: number
  completionPct: number
  holdCount: number
  issueCount: number
}

export type PlannerStop = {
  visitId: string
  propertyId: string
  propertyName?: string | null
  addressLine: string
  postcode: string
  customerName: string
  price: number
  status: string
  paymentHold: boolean
  technicianId?: string | null
  technicianName?: string | null
  issues: { id: string; type: string; note?: string | null }[]
  completedAt?: string | null
}

export type PlannerDayResult = {
  roundId: string
  roundName: string
  date: string
  stops: PlannerStop[]
  summary: {
    stopCount: number
    totalValue: number
    completedCount: number
    completionPct: number
    holdCount: number
    issueCount: number
  }
}

function jsonRequest(method: 'POST' | 'PATCH' | 'PUT', body?: unknown): RequestInit {
  return {
    method,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  }
}

export const roundsApi = {
  list: (status?: RoundStatus, signal?: AbortSignal) =>
    api<RoundListItem[]>(`/rounds${status ? `?status=${status}` : ''}`, { signal }),

  get: (id: string, signal?: AbortSignal) => api<RoundDetail>(`/rounds/${id}`, { signal }),

  // CONTRACT-DIFF: post-setup round CRUD not always in OpenAPI — live per handoff.
  create: (input: RoundCreateInput) =>
    api<RoundDetail>('/rounds', jsonRequest('POST', input)),

  update: (id: string, input: RoundUpdateInput) =>
    api<RoundDetail>(`/rounds/${id}`, jsonRequest('PATCH', input)),

  setTechnicians: (id: string, technicianIds: string[]) =>
    api<RoundDetail>(
      `/rounds/${id}/technicians`,
      jsonRequest('PUT', { technicianIds }),
    ),

  getOccurrences: (
    id: string,
    params: { from?: string; to?: string },
    signal?: AbortSignal,
  ) => {
    const search = new URLSearchParams()
    if (params.from) search.set('from', params.from)
    if (params.to) search.set('to', params.to)
    return api<PlannerOccurrence[]>(
      `/rounds/${id}/planner/occurrences?${search.toString()}`,
      { signal },
    )
  },

  getOccurrenceDay: (id: string, date: string, signal?: AbortSignal) =>
    api<PlannerDayResult>(`/rounds/${id}/planner/occurrences/${date}`, { signal }),
}
