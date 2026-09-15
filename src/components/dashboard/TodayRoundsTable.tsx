import type { TodayRound } from '@/content/dashboard'
import { dashboardRoundStatusLabels } from '@/content/dashboard'
import { DashboardIcon } from '@/components/dashboard/DashboardIcon'
import { TextLinkButton } from '@/components/dashboard/DashboardControls'
import { dashboardRowHoverClass } from '@/components/dashboard/dashboard-styles'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

interface TodayRoundsTableProps {
  title: string
  viewAll: string
  emptyLabel: string
  columns: {
    round: string
    technician: string
    status: string
    progress: string
    skipped: string
    issues: string
    value: string
    eta: string
  }
  rows: readonly TodayRound[]
  loading?: boolean
  onViewAll: () => void
  onSelectRound: (roundId: string) => void
}

const statusClass: Record<TodayRound['status'], string> = {
  complete: 'bg-success/10 text-success',
  in_progress: 'bg-primary/10 text-primary',
  not_started: 'bg-surface text-muted',
}

function StatusBadge({ status }: { status: TodayRound['status'] }) {
  return (
    <span className={cn('inline-flex rounded-lg px-2.5 py-1 text-xs font-semibold', statusClass[status])}>
      {dashboardRoundStatusLabels[status]}
    </span>
  )
}

/** Today's rounds — GET /dashboard/rounds. Rows open Today's Work. */
export function TodayRoundsTable({
  title,
  viewAll,
  emptyLabel,
  columns,
  rows,
  loading = false,
  onViewAll,
  onSelectRound,
}: TodayRoundsTableProps) {
  return (
    <section className="overflow-hidden rounded-xl border border-border bg-background shadow-sm">
      <div className="flex items-center justify-between px-4 py-4 sm:px-5">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h2>
        <TextLinkButton onClick={onViewAll}>
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
              <th className="px-4 py-3">{columns.status}</th>
              <th className="px-4 py-3">{columns.progress}</th>
              <th className="px-4 py-3">{columns.skipped}</th>
              <th className="px-4 py-3">{columns.issues}</th>
              <th className="px-4 py-3">{columns.value}</th>
              <th className="px-4 py-3">{columns.eta}</th>
              <th className="px-4 py-3" aria-label="Open round" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              Array.from({ length: 3 }, (_, index) => (
                <tr key={index}>
                  <td colSpan={9} className="px-5 py-4">
                    <Skeleton className="h-4 w-2/3" />
                  </td>
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-5 py-10 text-center text-sm text-muted">
                  {emptyLabel}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => onSelectRound(row.id)}
                  className={cn('cursor-pointer text-sm text-foreground', dashboardRowHoverClass)}
                >
                  <td className="px-4 py-4 font-semibold sm:px-5">{row.round}</td>
                  <td className="px-4 py-4">{row.technician}</td>
                  <td className="px-4 py-4">
                    <StatusBadge status={row.status} />
                  </td>
                  <td className="px-4 py-4">
                    <span className="font-semibold text-success">{row.completed}</span>
                    <span className="text-muted"> / {row.total}</span>
                  </td>
                  <td className={cn('px-4 py-4 font-semibold', row.skipped > 0 ? 'text-warning' : 'text-muted')}>
                    {row.skipped}
                  </td>
                  <td className={cn('px-4 py-4 font-semibold', row.issues > 0 ? 'text-danger' : 'text-muted')}>
                    {row.issues}
                  </td>
                  <td className="px-4 py-4 font-semibold">{row.value}</td>
                  <td className="px-4 py-4 text-muted">{row.eta}</td>
                  <td className="px-4 py-4">
                    <DashboardIcon name="chevron" className="h-4 w-4 text-muted" />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
