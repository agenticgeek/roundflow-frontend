import type { Pagination } from '@/api/pagination'
import { uiContent } from '@/content/ui'

/** "Showing 1–50 of 230" with Previous / Next — for `{ rows, pagination }` lists. */
export function Pager({
  pagination,
  loading = false,
  onPage,
  className = 'mt-4',
}: {
  pagination: Pagination
  loading?: boolean
  onPage: (page: number) => void
  className?: string
}) {
  const { page, pageSize, total, totalPages } = pagination
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)
  const copy = uiContent.pagination

  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 ${className}`}>
      <p className="text-sm text-muted">
        {copy.showing
          .replace('{from}', String(from))
          .replace('{to}', String(to))
          .replace('{total}', String(total))}
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={page <= 1 || loading}
          onClick={() => onPage(page - 1)}
          className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-semibold text-foreground transition-colors hover:bg-surface disabled:opacity-50"
        >
          {copy.previous}
        </button>
        <button
          type="button"
          disabled={page >= totalPages || loading}
          onClick={() => onPage(page + 1)}
          className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-semibold text-foreground transition-colors hover:bg-surface disabled:opacity-50"
        >
          {copy.next}
        </button>
      </div>
    </div>
  )
}
