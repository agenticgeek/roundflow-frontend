import { api } from '@/api/client'
import type { SendChannel } from '@/api/invoices.api'
import type { paths } from '@/api/types.gen'

type Json<T> = T extends { responses: { 200: { content: { 'application/json': infer R } } } } ? R : never

export type DirectDebitStatus = Json<paths['/customers/{id}/direct-debit']['get']>
export type DirectDebitLink = Json<paths['/customers/{id}/direct-debit/link']['post']>
export type DirectDebitSendResult = Json<paths['/customers/{id}/direct-debit/send']['post']>
export type MandateImportCandidates = Json<paths['/integrations/gocardless/mandates/import']['get']>
export type MandateImportCandidate = MandateImportCandidates['rows'][number]
export type MandateImportResult = Json<paths['/integrations/gocardless/mandates/import']['post']>
export type MandateImportLink = { mandateId: string; customerId: string }

const customerPath = (customerId: string) => `/customers/${encodeURIComponent(customerId)}/direct-debit`

/** GoCardless Direct Debit: setup links for one customer, and linking mandates made before RoundFlow. */
export const directDebitApi = {
  status: (customerId: string, signal?: AbortSignal) => api<DirectDebitStatus>(customerPath(customerId), { signal }),

  /** The setup link to copy (made if there is no valid one). Sends nothing. */
  link: (customerId: string) => api<DirectDebitLink>(`${customerPath(customerId)}/link`, { method: 'POST' }),

  send: (customerId: string, channel: SendChannel) =>
    api<DirectDebitSendResult>(`${customerPath(customerId)}/send`, { method: 'POST', body: JSON.stringify({ channel }) }),

  /** ADMIN only: existing GoCardless mandates with a suggested customer each. */
  importCandidates: (signal?: AbortSignal) =>
    api<MandateImportCandidates>('/integrations/gocardless/mandates/import', { signal }),

  /** ADMIN only: link the confirmed mandate -> customer pairs. */
  importMandates: (links: MandateImportLink[]) =>
    api<MandateImportResult>('/integrations/gocardless/mandates/import', { method: 'POST', body: JSON.stringify({ links }) }),
}
