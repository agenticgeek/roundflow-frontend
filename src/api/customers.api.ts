import { api } from '@/api/client'
import type {
  CustomerCreateInput,
  CustomerDetail,
  CustomerListParams,
  CustomerListResult,
  CustomerUpdateInput,
  PropertyCreateInput,
  PropertyCreateResult,
} from '@/api/types'

/** CONTRACT-DIFF: Customer row schema not in OpenAPI — create returns opaque JSON. */
type CustomerCreateResult = Record<string, unknown>

function jsonRequest(method: 'POST' | 'PATCH' | 'PUT', body?: unknown): RequestInit {
  return {
    method,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  }
}

function toQuery(params: CustomerListParams = {}): string {
  const search = new URLSearchParams()
  if (params.search) search.set('search', params.search)
  if (params.roundId) search.set('roundId', params.roundId)
  if (params.status) search.set('status', params.status)
  if (params.page != null) search.set('page', String(params.page))
  if (params.pageSize != null) search.set('pageSize', String(params.pageSize))
  const qs = search.toString()
  return qs ? `?${qs}` : ''
}

export const customersApi = {
  list: (params?: CustomerListParams, signal?: AbortSignal) =>
    api<CustomerListResult>(`/customers${toQuery(params)}`, { signal }),

  // CONTRACT-DIFF: POST /customers is in the handoff but may lag OpenAPI.
  create: (input: CustomerCreateInput) =>
    api<CustomerCreateResult>('/customers', jsonRequest('POST', input)),

  get: (id: string, signal?: AbortSignal) =>
    api<CustomerDetail>(`/customers/${id}`, { signal }),

  update: (id: string, input: CustomerUpdateInput) =>
    api<{ customerId?: string; propertyId?: string; servicePlanId?: string }>(
      `/customers/${id}`,
      jsonRequest('PATCH', input),
    ),

  // CONTRACT-DIFF: DELETE /customers soft-cancels; not always in OpenAPI.
  remove: (id: string) => api<void>(`/customers/${id}`, { method: 'DELETE' }),

  // CONTRACT-DIFF: add second property to existing customer.
  addProperty: (customerId: string, input: Omit<PropertyCreateInput, 'customerName' | 'phone' | 'email'>) =>
    api<PropertyCreateResult>(
      `/customers/${customerId}/properties`,
      jsonRequest('POST', input),
    ),
}
