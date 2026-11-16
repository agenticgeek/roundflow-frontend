import type { FloColumn, FloTableBlock } from '@/api/flo.api'
import { floContent } from '@/content/flo'
import { BlockLink } from '@/components/flo/BlockLink'
import { DashboardIcon } from '@/components/dashboard/DashboardIcon'
import { FOCUS_RING } from '@/components/flo/flo-styles'
import { formatFloValue } from '@/features/flo/lib/format'
import { downloadTableCsv } from '@/features/flo/lib/csv'
import { fillCopy } from '@/lib/utils'

const alignClass = (column: FloColumn) => (column.align === 'right' ? 'text-right tabular-nums' : 'text-left')

/** A real table: caption, column headers, right-aligned figures and a totals row. It scrolls inside its own box. */
export function TableBlock({ block }: { block: FloTableBlock }) {
  const title = block.title || floContent.table.untitled
  const totals = block.totals
  return (
    <div>
      <div
        role="region"
        aria-label={fillCopy(floContent.table.scrollLabel, { title })}
        tabIndex={0}
        className="scrollbar-card max-w-full overflow-x-auto rounded-xl border border-border bg-background"
      >
        <table className="w-full border-collapse text-sm">
          <caption className="px-4 py-3 text-left text-sm font-semibold text-foreground">{title}</caption>
          <thead>
            <tr className="border-y border-border bg-surface">
              {block.columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={`px-4 py-2 text-[11px] font-medium tracking-wide whitespace-nowrap text-muted uppercase ${alignClass(column)}`}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.rows.map((row, rowIndex) => (
              <tr key={rowIndex} className="border-b border-border last:border-0">
                {block.columns.map((column) => (
                  <td key={column.key} className={`px-4 py-2.5 ${alignClass(column)}`}>
                    {formatFloValue(row[column.key], column.format)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          {totals ? (
            <tfoot>
              <tr className="border-t border-border bg-surface font-semibold">
                {block.columns.map((column) => (
                  <td key={column.key} className={`px-4 py-2.5 ${alignClass(column)}`}>
                    {formatFloValue(totals[column.key], column.format)}
                  </td>
                ))}
              </tr>
            </tfoot>
          ) : null}
        </table>
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <BlockLink link={block.link} />
        <button
          type="button"
          aria-label={fillCopy(floContent.table.exportLabel, { title })}
          onClick={() => downloadTableCsv(block)}
          className={`mt-2 ml-auto inline-flex min-h-8 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-muted-strong hover:text-foreground ${FOCUS_RING}`}
        >
          <DashboardIcon name="download" className="h-4 w-4" />
          {floContent.table.exportCsv}
        </button>
      </div>
    </div>
  )
}
