/** `{ rows, pagination }` list responses (debt board, complaints, reports visits/technicians). */
export type Pagination = {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export type Paginated<T> = {
  rows: T[]
  pagination: Pagination
}

export type PageParams = {
  /** 1-based. */
  page?: number
  /** Default 50, max 100 (server-side). */
  pageSize?: number
}

/**
 * Normalises a paginated list response. A backend that hasn't shipped pagination yet still
 * returns a bare array — that's treated as a single page, so the frontend works against both.
 */
export function toPaginated<T>(body: Paginated<T> | T[]): Paginated<T> {
  if (Array.isArray(body)) {
    return {
      rows: body,
      pagination: { page: 1, pageSize: body.length, total: body.length, totalPages: 1 },
    }
  }
  return body
}

export function setPageParams(search: URLSearchParams, params: PageParams): void {
  if (params.page) search.set('page', String(params.page))
  if (params.pageSize) search.set('pageSize', String(params.pageSize))
}
