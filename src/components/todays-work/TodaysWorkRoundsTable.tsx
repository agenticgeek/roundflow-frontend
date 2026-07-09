import type { TodaysWorkRound } from '@/content/todays-work'
import { todaysWorkContent } from '@/content/todays-work'
import { DashboardIcon } from '@/components/dashboard/DashboardIcon'
import { PanelCard } from '@/components/dashboard/DashboardControls'
import { dashboardRowHoverClass } from '@/components/dashboard/dashboard-styles'
import { cn } from '@/lib/utils'

interface TodaysWorkRoundsTableProps {
  columns: typeof todaysWorkContent.table.columns
  emptyLabel: string
  rows: readonly TodaysWorkRound[]
  selectedRoundId: string | null
  onSelectRound: (roundId: string) => void
}

const statusDotClass: Record<TodaysWorkRound['status'], string> = {
  'in-progress': 'bg-primary',
  completed: 'bg-success',
  scheduled: 'bg-muted',
}

/** Live rounds table with progress and problem indicators. */
export function TodaysWorkRoundsTable({
  columns,
  emptyLabel,
  rows,
  selectedRoundId,
  onSelectRound,
}: TodaysWorkRoundsTableProps) {
  const { statusLabels } = todaysWorkContent

  return (
    <PanelCard interactive={false} className="overflow-hidden bg-card p-0">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1080px] border-collapse text-left">
          <thead>
            <tr className="border-b border-border bg-surface text-xs font-semibold tracking-wide text-muted uppercase">
              <th className="px-4 py-3 sm:px-5">{columns.status}</th>
              <th className="px-4 py-3">{columns.round}</th>
              <th className="px-4 py-3">{columns.technician}</th>
              <th className="px-4 py-3">{columns.progress}</th>
              <th className="px-4 py-3">{columns.completed}</th>
              <th className="px-4 py-3">{columns.skipped}</th>
              <th className="px-4 py-3">{columns.issues}</th>
              <th className="px-4 py-3">{columns.paymentHolds}</th>
              <th className="px-4 py-3">{columns.value}</th>
              <th className="px-4 py-3">{columns.eta}</th>
              <th className="px-4 py-3">{columns.actions}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={11} className="px-5 py-10 text-center text-sm text-muted">
                  {emptyLabel}
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const selected = selectedRoundId === row.id

                return (
                  <tr
                    key={row.id}
                    onClick={() => onSelectRound(row.id)}
                    className={cn(
                      'cursor-pointer text-sm text-foreground',
                      dashboardRowHoverClass,
                      selected && 'bg-primary/5',
                    )}
                  >
                  <td className="px-4 py-4 sm:px-5">
                    <span className="inline-flex items-center gap-2">
                      <span
                        className={cn('h-2.5 w-2.5 rounded-full', statusDotClass[row.status])}
                        aria-hidden="true"
                      />
                      <span className="sr-only">{statusLabels[row.status]}</span>
                    </span>
                  </td>
                  <td className="px-4 py-4 font-semibold">{row.round}</td>
                  <td className="px-4 py-4">
                    <span className="inline-flex items-center gap-2">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                        {row.technicianInitial}
                      </span>
                      {row.technician}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <ProgressBar completed={row.progressCompleted} total={row.progressTotal} />
                  </td>
                  <td className="px-4 py-4">
                    <StatCell variant="completed" value={row.completed} />
                  </td>
                  <td className="px-4 py-4">
                    <StatCell variant="skipped" value={row.skipped} />
                  </td>
                  <td className="px-4 py-4">
                    <StatCell variant="issues" value={row.issues} />
                  </td>
                  <td className="px-4 py-4">
                    <StatCell variant="payment-hold" value={row.paymentHolds} />
                  </td>
                  <td className="px-4 py-4 font-semibold">{row.value}</td>
                  <td className="px-4 py-4 text-muted">{row.eta}</td>
                  <td className="px-4 py-4" onClick={(event) => event.stopPropagation()}>
                    <button
                      type="button"
                      aria-label="Round actions"
                      className="rounded-lg p-1.5 text-muted transition-colors hover:bg-surface hover:text-foreground"
                    >
                      <DashboardIcon name="more-vertical" className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </PanelCard>
  )
}

function ProgressBar({ completed, total }: { completed: number; total: number }) {
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0

  return (
    <div className="min-w-[7rem]">
      <div className="h-2 overflow-hidden rounded-full bg-surface">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${percent}%` }} />
      </div>
      <p className="mt-1 text-xs font-medium text-muted">
        {completed}/{total}
      </p>
    </div>
  )
}

type StatVariant = 'completed' | 'skipped' | 'issues' | 'payment-hold'

const statVariantConfig: Record<
  StatVariant,
  { icon: string; activeClass: string; mutedClass: string; circled: boolean }
> = {
  completed: {
    icon: 'check-circle',
    activeClass: 'text-success',
    mutedClass: 'text-muted',
    circled: true,
  },
  skipped: {
    icon: 'x-circle',
    activeClass: 'text-warning',
    mutedClass: 'text-muted',
    circled: true,
  },
  issues: {
    icon: 'alert-circle',
    activeClass: 'text-danger',
    mutedClass: 'text-muted',
    circled: true,
  },
  'payment-hold': {
    icon: 'card',
    activeClass: 'text-danger',
    mutedClass: 'text-muted',
    circled: false,
  },
}

function StatCell({ variant, value }: { variant: StatVariant; value: number }) {
  const config = statVariantConfig[variant]
  const active = value > 0
  const colorClass = active ? config.activeClass : config.mutedClass

  return (
    <span className="inline-flex items-center gap-2">
      <DashboardIcon name={config.icon} className={cn('h-5 w-5', colorClass)} />
      <span className="font-semibold text-foreground">{value}</span>
    </span>
  )
}
