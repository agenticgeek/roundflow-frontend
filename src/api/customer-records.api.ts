import { api } from '@/api/client'
import { toQueryString } from '@/api/invoices.api'
import type { components, paths } from '@/api/types.gen'

/**
 * Customer endpoints used by Property detail (customers.api.ts is owned by the Customers
 * list): the full visit history and the bad-debt flag.
 */
export type CustomerVisitsPage = components['schemas']['CustomerVisitsPage']
export type CustomerVisitRow = components['schemas']['VisitHistoryRow']
export type BadDebtInput = paths['/customers/{id}/bad-debt']['patch']['requestBody']['content']['application/json']
export type BadDebtResult =
  paths['/customers/{id}/bad-debt']['patch']['responses'][200]['content']['application/json']

export const CUSTOMER_VISITS_PAGE_SIZE = 25

export const customerRecordsApi = {
  /** GET /customers/:id/visits — newest first, every status incl. CANCELLED (A4 · GAP-020). */
  visits: (id: string, params: { page?: number; pageSize?: number } = {}, signal?: AbortSignal) =>
    api<CustomerVisitsPage>(`/customers/${encodeURIComponent(id)}/visits${toQueryString(params)}`, { signal }),

  /** PATCH /customers/:id/bad-debt — `reason` only goes to the activity log (GAP-022). */
  setBadDebt: (id: string, input: BadDebtInput) =>
    api<BadDebtResult>(`/customers/${encodeURIComponent(id)}/bad-debt`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),
}
