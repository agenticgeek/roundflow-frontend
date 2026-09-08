import { api } from '@/api/client'

/** CONTRACT-DIFF: `/technicians` module not in generated OpenAPI yet — live per TECHNICIANS_HANDOFF. */

export type TechnicianAppStatus = 'PENDING_INVITE' | 'ACTIVE' | 'INACTIVE'

export type TechnicianServiceAreaAssignment = {
  serviceAreaId: string
  serviceAreaName: string
  assignedAt: string
}

export type TechnicianListItem = {
  id: string
  name: string | null
  phone: string | null
  role: string | null
  email: string | null
  notes: string | null
  active: boolean
  appStatus: TechnicianAppStatus
  serviceAreas: TechnicianServiceAreaAssignment[]
  createdAt: string
}

export type TechnicianTodayWorkload = {
  roundId: string
  roundName: string
  total: number
  completed: number
  skipped: number
  remaining: number
}

export type TechnicianDetail = TechnicianListItem & {
  roundNames: string[]
  todayWorkload: TechnicianTodayWorkload[]
}

export type TechnicianCreateInput = {
  name?: string
  phone?: string
  role?: string
  email?: string | null
  notes?: string | null
  serviceAreaId?: string | null
  sendInvite?: boolean
}

export type TechnicianUpdateInput = {
  name?: string
  phone?: string
  role?: string
  email?: string | null
  notes?: string | null
  active?: boolean
  serviceAreaId?: string | null
}

function jsonRequest(method: 'POST' | 'PATCH', body?: unknown): RequestInit {
  return {
    method,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  }
}

export const techniciansApi = {
  list: (signal?: AbortSignal) =>
    api<TechnicianListItem[]>('/technicians', { signal }),

  get: (id: string, signal?: AbortSignal) =>
    api<TechnicianDetail>(`/technicians/${id}`, { signal }),

  create: (input: TechnicianCreateInput) =>
    api<TechnicianListItem>('/technicians', jsonRequest('POST', input)),

  update: (id: string, input: TechnicianUpdateInput) =>
    api<TechnicianListItem>(`/technicians/${id}`, jsonRequest('PATCH', input)),
}
