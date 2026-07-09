import { useState } from 'react'
import type { TodayRound } from '@/content/dashboard'
import { DashboardIcon } from '@/components/dashboard/DashboardIcon'
import { TextLinkButton } from '@/components/dashboard/DashboardControls'
import { dashboardRowHoverClass } from '@/components/dashboard/dashboard-styles'
import { cn } from '@/lib/utils'

interface TodayRoundsTableProps {
  title: string
  viewAll: string
  columns: {
    round: string
    technician: string
    stops: string
    done: string
    skip: string
    issues: string
    value: string
    status: string
  }
  rows: readonly TodayRound[]
}

function StatusBadge({ status }: { status: TodayRound['status'] }) {
  const completed = status === 'completed'

  return (
    <span
      className={cn(
        'inline-flex rounded-lg px-2.5 py-1 text-xs font-semibold',
        completed ? 'bg-success/10 text-success' : 'bg-primary/10 text-primary',
      )}
    >
      {completed ? 'Completed' : 'In progress'}
    </span>
  )
}

/** Today's rounds table — rows highlight on hover and track selection. */
export function TodayRoundsTable({ title, viewAll, columns, rows }: TodayRoundsTableProps) {
  const [selectedRound, setSelectedRound] = useState<string | null>(null)

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-background shadow-sm">
      <div className="flex items-center justify-between px-4 py-4 sm:px-5">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h2>
        <TextLinkButton>
          {viewAll}
          <DashboardIcon name="chevron" className="h-4 w-4" />
        </TextLinkButton>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-left">
          <thead>
            <tr className="border-y border-border bg-surface text-xs font-semibold tracking-wide text-muted uppercase">
              <th className="px-4 py-3 sm:px-5">{columns.round}</th>
              <th className="px-4 py-3">{columns.technician}</th>
              <th className="px-4 py-3">{columns.stops}</th>
              <th className="px-4 py-3">{columns.done}</th>
              <th className="px-4 py-3">{columns.skip}</th>
              <th className="px-4 py-3">{columns.issues}</th>
              <th className="px-4 py-3">{columns.value}</th>
              <th className="px-4 py-3">{columns.status}</th>
              <th className="px-4 py-3" aria-label="Open round" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row) => {
              const selected = selectedRound === row.round

              return (
                <tr
                  key={row.round}
                  onClick={() => setSelectedRound(row.round)}
                  className={cn(
                    'cursor-pointer text-sm text-foreground',
                    dashboardRowHoverClass,
                    selected && 'bg-primary/5',
                  )}
                >
                  <td className="px-4 py-4 font-semibold sm:px-5">{row.round}</td>
                  <td className="px-4 py-4">{row.technician}</td>
                  <td className="px-4 py-4">{row.stops}</td>
                  <td className="px-4 py-4 font-semibold text-success">{row.done}</td>
                  <td className="px-4 py-4 font-semibold text-warning">{row.skip}</td>
                  <td className="px-4 py-4 font-semibold text-danger">{row.issues}</td>
                  <td className="px-4 py-4 font-semibold">{row.value}</td>
                  <td className="px-4 py-4">
                    <StatusBadge status={row.status} />
                  </td>
                  <td className="px-4 py-4">
                    <DashboardIcon name="chevron" className="h-4 w-4 text-muted" />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}
