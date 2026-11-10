import type { FloDateRange, FloSource } from '@/api/flo.api'
import { floContent } from '@/content/flo'
import { fillCopy } from '@/lib/utils'

/** "Checked 6 data sources": a disclosure listing each source, its row count and the dates covered. */
export function SourcesPill({ sources, dateRange }: { sources: readonly FloSource[]; dateRange?: FloDateRange }) {
  const copy = floContent.working
  const summary = sources.length === 1 ? copy.checkedOne : fillCopy(copy.checked, { count: sources.length })
  return (
    <details className="text-sm text-muted">
      <summary className="inline-flex min-h-6 cursor-pointer items-center rounded-full border border-border px-3 py-0.5">
        {summary}
      </summary>
      <ul className="mt-2 space-y-0.5 pl-1">
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
