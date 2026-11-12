import { Link } from 'react-router-dom'
import type { FloColumn, FloTableBlock } from '@/api/flo.api'
import { floContent } from '@/content/flo'
import { DashboardIcon } from '@/components/dashboard/DashboardIcon'
import { formatFloValue } from '@/features/flo/lib/format'
import { floLinkTarget } from '@/features/flo/lib/links'
import { fillCopy } from '@/lib/utils'

const alignClass = (column: FloColumn) => (column.align === 'right' ? 'text-right tabular-nums' : 'text-left')

/** A real table: caption, column headers, right-aligned figures and a totals row. It scrolls inside its own box. */
export function TableBlock({ block }: { block: FloTableBlock }) {
  const title = block.title || floContent.table.untitled
  const target = floLinkTarget(block.link)
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
      {target && block.link ? (
        <Link
          to={target}
          className="group mt-2 inline-flex items-center gap-1 text-sm font-medium text-accent underline-offset-4 hover:underline"
        >
          {floContent.link[block.link.screen as keyof typeof floContent.link]}
          <DashboardIcon name="arrow-right" className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      ) : null}
    </div>
  )
}
