import { api } from '@/api/client'
import { setPageParams, toPaginated, type PageParams, type Paginated } from '@/api/pagination'

/** CONTRACT-DIFF: `/complaints` module not in generated OpenAPI yet — live per COMPLAINTS_HANDOFF. */

export type ComplaintStatus = 'OPEN' | 'IN_REVIEW' | 'REVISIT_BOOKED' | 'RESOLVED'
export type ComplaintSeverity = 'LOW' | 'MEDIUM' | 'HIGH'

export type Complaint = {
  id: string
  status: ComplaintStatus
  severity: ComplaintSeverity
  title: string
  description: string | null
  issueType: string | null
  customerId: string
  customerName: string
  propertyId: string | null
  technicianId: string | null
  revisitDate: string | null
  createdAt: string
}

/** GET /complaints/:id — the list row plus detail fields (audit follow-up 2026-10-22). */
export type ComplaintDetail = Complaint & {
  propertyAddress?: string | null
  technicianName?: string | null
  messageCount?: number
  resolvedAt?: string | null
  resolvedBy?: string | null
  notes?: string | null
}

export type ComplaintListParams = PageParams & {
  status?: ComplaintStatus
  search?: string
  assignedTo?: 'me'
  technicianId?: string
}

export type ComplaintCreateInput = {
  customerId: string
  title: string
  description?: string
  issueType?: string
  severity?: ComplaintSeverity
  propertyId?: string
  technicianId?: string | null
}

export type ComplaintMessageDirection = 'INBOUND' | 'OUTBOUND'

export type ComplaintMessage = {
  id: string
  direction: ComplaintMessageDirection
  channel: string
  body: string
  complaintId: string
  createdAt: string
}

function jsonRequest(method: 'POST', body?: unknown): RequestInit {
  return {
    method,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  }
}

function toQuery(params: ComplaintListParams = {}): string {
  const search = new URLSearchParams()
  if (params.status) search.set('status', params.status)
  if (params.search) search.set('search', params.search)
  if (params.assignedTo) search.set('assignedTo', params.assignedTo)
  if (params.technicianId) search.set('technicianId', params.technicianId)
  setPageParams(search, params)
  const qs = search.toString()
  return qs ? `?${qs}` : ''
}

export const complaintsApi = {
  /** Paginated `{ rows, pagination }` (audit follow-up 2026-10-22). */
  list: async (params?: ComplaintListParams, signal?: AbortSignal): Promise<Paginated<Complaint>> =>
    toPaginated(await api<Paginated<Complaint> | Complaint[]>(`/complaints${toQuery(params)}`, { signal })),

  get: (id: string, signal?: AbortSignal) => api<ComplaintDetail>(`/complaints/${id}`, { signal }),

  create: (input: ComplaintCreateInput) =>
    api<Complaint>('/complaints', jsonRequest('POST', input)),

  markInReview: (id: string) =>
    api<Complaint>(`/complaints/${id}/mark-in-review`, jsonRequest('POST')),

  scheduleRevisit: (id: string, revisitDate: string) =>
    api<Complaint>(`/complaints/${id}/schedule-revisit`, jsonRequest('POST', { revisitDate })),

  resolve: (id: string, notes?: string) =>
    api<ComplaintDetail>(
      `/complaints/${id}/resolve`,
      jsonRequest('POST', notes ? { notes } : undefined),
    ),

  reopen: (id: string) => api<Complaint>(`/complaints/${id}/reopen`, jsonRequest('POST')),

  assignTechnician: (id: string, technicianId: string) =>
    api<Complaint>(
      `/complaints/${id}/assign-technician`,
      jsonRequest('POST', { technicianId }),
    ),

  listMessages: (id: string, signal?: AbortSignal) =>
    api<ComplaintMessage[]>(`/complaints/${id}/messages`, { signal }),

  addMessage: (id: string, body: string) =>
    api<ComplaintMessage>(`/complaints/${id}/messages`, jsonRequest('POST', { body })),
}
