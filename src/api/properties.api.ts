import { api } from '@/api/client'
import type { Property, PropertyCreateInput, PropertyCreateResult } from '@/api/types'

function jsonRequest(method: 'POST' | 'PATCH', body?: unknown): RequestInit {
  return {
    method,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  }
}

export const propertiesApi = {
  createProperty: (input: PropertyCreateInput) =>
    api<PropertyCreateResult>('/properties', jsonRequest('POST', input)),
  updateProperty: (id: string, input: Partial<PropertyCreateInput>) =>
    api<Property>(`/properties/${id}`, jsonRequest('PATCH', input)),
}
