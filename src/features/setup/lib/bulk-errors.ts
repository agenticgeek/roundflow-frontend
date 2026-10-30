/** One row the bulk endpoint rejected. `row` is the 0-based index within the request. */
export interface BulkRowError {
  row: number
  field?: string
  message: string
}

type RawRowError = { row?: unknown; field?: unknown; error?: unknown; message?: unknown }

/**
 * `errors[]` from POST /setup/step/9/bulk (the 201 body, or the 400 when every row failed).
 * GAP-009: each item is `{ row, field, error }`; `message` is the deprecated copy of `error`,
 * read only when `error` is missing. Items with neither are dropped.
 */
export function toBulkRowErrors(items: unknown): BulkRowError[] {
  if (!Array.isArray(items)) return []
  return items.flatMap((item: RawRowError | null) => {
    const text = typeof item?.error === 'string' ? item.error : item?.message
    if (typeof text !== 'string') return []
    return [
      {
        row: Number(item?.row),
        field: typeof item?.field === 'string' && item.field !== 'unknown' ? item.field : undefined,
        message: text,
      },
    ]
  })
}
