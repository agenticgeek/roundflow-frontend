import type { FloDateRange, FloSource } from '@/api/flo.api'
import { floContent } from '@/content/flo'
import { DashboardIcon } from '@/components/dashboard/DashboardIcon'
import { fillCopy } from '@/lib/utils'

/** "Checked 6 data sources": a disclosure listing each source, its row count and the dates covered. */
export function SourcesPill({ sources, dateRange }: { sources: readonly FloSource[]; dateRange?: FloDateRange }) {
  const copy = floContent.working
  const summary = sources.length === 1 ? copy.checkedOne : fillCopy(copy.checked, { count: sources.length })
  return (
    <details className="group text-sm text-muted">
      <summary className="inline-flex min-h-7 cursor-pointer list-none items-center gap-1.5 rounded-full border border-border bg-card px-3 py-0.5 text-xs font-medium transition-colors hover:border-primary/30 hover:text-accent [&::-webkit-details-marker]:hidden">
        <DashboardIcon name="check-circle" className="h-3.5 w-3.5" />
        {summary}
        <DashboardIcon name="chevron-down" className="h-3.5 w-3.5 transition-transform duration-200 group-open:rotate-180" />
      </summary>
      <ul className="mt-2 animate-fade-in space-y-1 rounded-xl border border-border bg-surface px-3.5 py-2.5 text-xs">
        {sources.map((source) => (
          <li key={source.id}>
            {source.rows === 1
              ? fillCopy(floContent.sources.rowOne, { label: source.label })
              : fillCopy(floContent.sources.row, { label: source.label, rows: source.rows })}
          </li>
        ))}
        {dateRange ? <li>{fillCopy(floContent.sources.range, { range: dateRange.label })}</li> : null}
      </ul>
    </details>
  )
}
