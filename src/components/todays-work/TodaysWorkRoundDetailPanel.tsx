import type { TodaysWorkJob, TodaysWorkRound } from '@/content/todays-work'
import { todaysWorkContent } from '@/content/todays-work'
import { DashboardIcon } from '@/components/dashboard/DashboardIcon'
import { PanelCard } from '@/components/dashboard/DashboardControls'
import { SidePanel } from '@/components/ui/side-panel'
import { dashboardCtaClass, toneBorderClass } from '@/components/dashboard/dashboard-styles'
import { cn } from '@/lib/utils'

interface TodaysWorkRoundDetailPanelProps {
  round: TodaysWorkRound | null
  onClose: () => void
  onReassignTechnician?: (roundId: string) => void
  onPushMissedJobs?: (roundId: string) => void
}

const roundStatusClass: Record<TodaysWorkRound['status'], string> = {
  'in-progress': 'bg-primary/10 text-primary',
  completed: 'bg-success/10 text-success',
  scheduled: 'bg-surface text-muted',
}

const jobStatusClass: Record<TodaysWorkJob['status'], string> = {
  completed: 'bg-success/10 text-success',
  skipped: 'bg-warning-surface text-warning',
  scheduled: 'bg-primary/10 text-primary',
  'in-progress': 'bg-primary/10 text-primary',
}

/** Right-side round detail — opened from the live rounds table. */
export function TodaysWorkRoundDetailPanel({
  round,
  onClose,
  onReassignTechnician,
  onPushMissedJobs,
}: TodaysWorkRoundDetailPanelProps) {
  const { detailPanel, statusLabels } = todaysWorkContent

  if (!round) return null

  const progressPercent =
    round.progressTotal > 0 ? Math.round((round.progressCompleted / round.progressTotal) * 100) : 0

  return (
    <SidePanel
      open
      onClose={onClose}
      title={round.round}
      widthClass="max-w-sm"
      bodyClassName="space-y-5"
      footer={
        <div className="space-y-2">
          <button
            type="button"
            className={cn(dashboardCtaClass, 'w-full')}
            onClick={() => onReassignTechnician?.(round.id)}
          >
            <DashboardIcon name="arrows-horizontal" className="h-4 w-4" />
            {detailPanel.actions.reassignTechnician}
          </button>
          <button
            type="button"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent-surface px-4 py-2.5 text-sm font-medium leading-none text-foreground transition-colors hover:bg-accent-surface/80"
            onClick={() => onPushMissedJobs?.(round.id)}
          >
            <DashboardIcon name="chevron-right" className="h-4 w-4" />
            {detailPanel.actions.pushMissedJobs}
          </button>
        </div>
      }
    >
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-foreground text-sm font-semibold text-primary-foreground">
          {round.technicianInitial}
        </span>
        <div className="min-w-0">
          <p className="font-semibold text-foreground">{round.technician}</p>
          <span
            className={cn(
              'mt-1 inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold',
              roundStatusClass[round.status],
            )}
          >
            {statusLabels[round.status]}
          </span>
        </div>
      </div>

      <section className="space-y-2 border-t border-border pt-4">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-foreground">{detailPanel.progress}</span>
          <span className="text-muted">
            {detailPanel.progressMeta
              .replace('{completed}', String(round.progressCompleted))
              .replace('{total}', String(round.progressTotal))}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-surface">
          <div
            className="h-full rounded-full bg-success transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </section>

      <section className="grid grid-cols-3 gap-2">
        <SummaryCard label={detailPanel.summary.completed} value={round.completed} tone="primary" />
        <SummaryCard label={detailPanel.summary.skipped} value={round.skipped} tone="warning" />
        <SummaryCard label={detailPanel.summary.issues} value={round.issues} tone="danger" />
      </section>

      <section className="border-t border-border pt-4 pb-1">
        <h3 className="text-sm font-medium text-foreground">{detailPanel.jobsTitle}</h3>
        <ul className="mt-3 space-y-2">
          {round.jobs.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </ul>
      </section>
    </SidePanel>
  )
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: 'primary' | 'warning' | 'danger'
}) {
  return (
    <PanelCard interactive={false} className={cn('px-3 py-2.5 text-center', toneBorderClass(tone))}>
      <p className="text-lg font-semibold text-foreground">{value}</p>
      <p className="mt-0.5 text-[11px] font-medium text-muted">{label}</p>
    </PanelCard>
  )
}

function JobCard({ job }: { job: TodaysWorkJob }) {
  const { detailPanel } = todaysWorkContent

  return (
    <li className="rounded-xl border border-border bg-card px-3 py-3 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-foreground">{job.customer}</p>
          <p className="mt-0.5 text-sm text-muted">{job.address}</p>
        </div>
        <span
          className={cn(
            'shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold',
            jobStatusClass[job.status],
          )}
        >
          {detailPanel.jobStatusLabels[job.status]}
        </span>
      </div>

      {job.paymentHold || job.issueNote ? (
        <div className="mt-2 space-y-1 border-t border-border pt-2">
          {job.paymentHold ? (
            <p className="inline-flex items-center gap-1.5 text-xs font-medium text-danger">
              <DashboardIcon name="card" className="h-3.5 w-3.5" />
              {detailPanel.paymentHold}
            </p>
          ) : null}
          {job.issueNote ? (
            <p className="inline-flex items-center gap-1.5 text-xs font-medium text-warning">
              <DashboardIcon name="alert-circle" className="h-3.5 w-3.5" />
              {job.issueNote}
            </p>
          ) : null}
        </div>
      ) : null}
    </li>
  )
}
