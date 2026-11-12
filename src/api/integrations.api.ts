import { api } from '@/api/client'
import type { paths } from '@/api/types.gen'

type ListOperation = paths['/integrations/outbox']['get']
type ListResponse = ListOperation['responses'][200]['content']['application/json']

/** `dead` = gave up after the last retry; `failed` = failed but will be tried again. */
export type OutboxStatus = NonNullable<NonNullable<ListOperation['parameters']['query']>['status']>
export type OutboxPage = ListResponse
export type OutboxRow = ListResponse['rows'][number]
export type OutboxReplayResult = paths['/integrations/outbox/{id}/replay']['post']['responses'][200]['content']['application/json']

/** Failed integration messages (ADMIN only; a MANAGER gets 403 ADMIN_ONLY). */
export const integrationsApi = {
  outbox: (status: OutboxStatus, page: number, signal?: AbortSignal) =>
    api<OutboxPage>(`/integrations/outbox?status=${status}&page=${page}`, { signal }),

  /** Puts a dead or failed message back in the queue; the worker retries it within about a minute. */
  replay: (id: string) => api<OutboxReplayResult>(`/integrations/outbox/${encodeURIComponent(id)}/replay`, { method: 'POST' }),
}
