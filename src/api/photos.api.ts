import { api } from '@/api/client'
import { toQueryString } from '@/api/invoices.api'
import type { components } from '@/api/types.gen'

export type PhotoRow = components['schemas']['PhotoRow']
export type PhotoType = components['schemas']['PhotoType']
export type PhotoPage = components['schemas']['PhotoPage']

/** Default gallery page size (the server's default; max 100). */
export const PHOTO_PAGE_SIZE = 24

/** GAP-019 photo galleries. `url` / `thumbnailUrl` are 1-hour signed URLs. */
export const photosApi = {
  /** GET /properties/:id/photos — property + visit photos, newest first. */
  property: (id: string, params: { type?: PhotoType; page?: number; pageSize?: number } = {}, signal?: AbortSignal) =>
    api<PhotoPage>(`/properties/${encodeURIComponent(id)}/photos${toQueryString(params)}`, { signal }),

  /** GET /technicians/:id/photos — photos from the technician's visits, newest first. */
  technician: (id: string, params: { page?: number; pageSize?: number } = {}, signal?: AbortSignal) =>
    api<PhotoPage>(`/technicians/${encodeURIComponent(id)}/photos${toQueryString(params)}`, { signal }),

  /** GET /visits/:id/photos — one page, oldest first. */
  visit: (id: string, signal?: AbortSignal) =>
    api<PhotoPage>(`/visits/${encodeURIComponent(id)}/photos`, { signal }),
}
