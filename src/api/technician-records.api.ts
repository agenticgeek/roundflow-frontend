import { api } from '@/api/client'
import { toQueryString } from '@/api/invoices.api'
import type { components, paths } from '@/api/types.gen'

export type TechnicianPerformance = components['schemas']['TechnicianPerformance']
export type PerformancePeriod = NonNullable<
  NonNullable<paths['/technicians/{id}/performance']['get']['parameters']['query']>['period']
>
export type IncidentType = components['schemas']['IncidentType']
export type TechnicianIncident = components['schemas']['TechnicianIncident']
export type IncidentInput = paths['/technicians/{id}/incidents']['post']['requestBody']['content']['application/json']
export type IncidentPage = { rows: TechnicianIncident[]; pagination: components['schemas']['Pagination'] }
export type TechnicianAvailability = components['schemas']['TechnicianAvailability']
export type AvailabilityInput = paths['/technicians/{id}/availability']['post']['requestBody']['content']['application/json']
export type AvailabilityCreated = TechnicianAvailability & { visitsRestamped: number }
export type ReplaceTechnicianInput = paths['/technicians/{id}/replace']['post']['requestBody']['content']['application/json']

function path(id: string, suffix: string) {
  return `/technicians/${encodeURIComponent(id)}/${suffix}`
}

function post(body: unknown): RequestInit {
  return { method: 'POST', body: JSON.stringify(body) }
}

/** Technician performance, incidents, availability and replacement (GAP-025 / GAP-030). */
export const technicianRecordsApi = {
  performance: (id: string, period: PerformancePeriod, signal?: AbortSignal) =>
    api<TechnicianPerformance>(`${path(id, 'performance')}${toQueryString({ period })}`, { signal }),

  incidents: (id: string, params: { type?: IncidentType; page?: number } = {}, signal?: AbortSignal) =>
    api<IncidentPage>(`${path(id, 'incidents')}${toQueryString(params)}`, { signal }),

  recordIncident: (id: string, input: IncidentInput) => api<TechnicianIncident>(path(id, 'incidents'), post(input)),

  deleteIncident: (incidentId: string) =>
    api<void>(`/technician-incidents/${encodeURIComponent(incidentId)}`, { method: 'DELETE' }),

  availability: (id: string, signal?: AbortSignal) =>
    api<TechnicianAvailability[]>(path(id, 'availability'), { signal }),

  addAvailability: (id: string, input: AvailabilityInput) =>
    api<AvailabilityCreated>(path(id, 'availability'), post(input)),

  removeAvailability: (id: string, availabilityId: string) =>
    api<void>(`${path(id, 'availability')}/${encodeURIComponent(availabilityId)}`, { method: 'DELETE' }),

  replace: (id: string, input: ReplaceTechnicianInput) =>
    api<{ visitsReassigned: number }>(path(id, 'replace'), post(input)),
}
