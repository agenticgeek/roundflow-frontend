import { api } from '@/api/client'
import type { components } from '@/api/types.gen'

export type VisitCreateInput = components['schemas']['VisitCreateInput']
export type Visit = components['schemas']['Visit']

function jsonRequest(method: 'POST', body?: unknown): RequestInit {
  return {
    method,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  }
}

export const visitsApi = {
  /** Add One-off Job — pass `roundId` for the visit to appear in the Round Planner. */
  create: (input: VisitCreateInput) => api<Visit>('/visits', jsonRequest('POST', input)),
}
