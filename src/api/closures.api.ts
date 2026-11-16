import { api } from '@/api/client'
import type {
  Closure,
  ClosureApplyInput,
  ClosureApplyPreview,
  ClosureApplyResult,
  ClosureCreateInput,
  ClosureListResult,
  ClosureUpdateInput,
  IsoDate,
} from '@/features/closures/types'

function jsonRequest(method: 'POST' | 'PATCH', body?: unknown): RequestInit {
  return {
    method,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  }
}

function toQuery(params: { from?: IsoDate; to?: IsoDate } = {}): string {
  const search = new URLSearchParams()
  if (params.from) search.set('from', params.from)
  if (params.to) search.set('to', params.to)
  const qs = search.toString()
  return qs ? `?${qs}` : ''
}

/** Business closures (ADMIN and MANAGER). Types are hand-written until the backend OpenAPI is deployed. */
export const closuresApi = {
  list: (params?: { from?: IsoDate; to?: IsoDate }, signal?: AbortSignal) =>
    api<ClosureListResult>(`/closures${toQuery(params)}`, { signal }),

  create: (input: ClosureCreateInput) => api<Closure>('/closures', jsonRequest('POST', input)),

  update: (id: string, input: ClosureUpdateInput) =>
    api<Closure>(`/closures/${id}`, jsonRequest('PATCH', input)),

  remove: (id: string) => api<void>(`/closures/${id}`, { method: 'DELETE' }),

  /** No writes: what "apply to existing visits" would do. */
  previewApply: (id: string) => api<ClosureApplyPreview>(`/closures/${id}/apply/preview`, jsonRequest('POST')),

  /** Pass the same `idempotencyKey` on a retry of the same attempt so the server applies it once. */
  apply: (id: string, input?: ClosureApplyInput, idempotencyKey?: string) =>
    api<ClosureApplyResult>(`/closures/${id}/apply`, {
      ...jsonRequest('POST', input ?? {}),
      idempotencyKey,
    }),
}
