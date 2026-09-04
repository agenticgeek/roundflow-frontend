import { api } from '@/api/client'

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

export type ComplaintListParams = {
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
  const qs = search.toString()
  return qs ? `?${qs}` : ''
}

export const complaintsApi = {
  list: (params?: ComplaintListParams, signal?: AbortSignal) =>
    api<Complaint[]>(`/complaints${toQuery(params)}`, { signal }),

  get: (id: string, signal?: AbortSignal) => api<Complaint>(`/complaints/${id}`, { signal }),

  create: (input: ComplaintCreateInput) =>
    api<Complaint>('/complaints', jsonRequest('POST', input)),

  markInReview: (id: string) =>
    api<Complaint>(`/complaints/${id}/mark-in-review`, jsonRequest('POST')),

  scheduleRevisit: (id: string, revisitDate: string) =>
    api<Complaint>(`/complaints/${id}/schedule-revisit`, jsonRequest('POST', { revisitDate })),

  resolve: (id: string) => api<Complaint>(`/complaints/${id}/resolve`, jsonRequest('POST')),

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
