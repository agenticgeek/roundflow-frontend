import type { TechnicianRecord } from '@/content/technicians'
import { technicianStatusLabels, techniciansContent } from '@/content/technicians'
import { TechniciansOverviewSkeleton } from '@/components/technicians/TechniciansSkeletons'
import { DashboardIcon } from '@/components/dashboard/DashboardIcon'
import { dashboardCtaClass, dashboardPressableClass } from '@/components/dashboard/dashboard-styles'
import { cn } from '@/lib/utils'

interface OverviewMetric {
  label: string
  value: string
  accent?: boolean
}

interface TechnicianOverviewProps {
  technicians: readonly TechnicianRecord[]
  metrics: readonly OverviewMetric[]
  dateLabel: string
  loading?: boolean
  error?: string | null
  canMutate?: boolean
  onRetry?: () => void
  onAdd: () => void
  onDetails: (id: string) => void
  onConversation: (id: string) => void
}

export function TechnicianOverview({
  technicians,
  metrics,
  dateLabel,
  loading = false,
  error = null,
  canMutate = true,
  onRetry,
  onAdd,
  onDetails,
  onConversation,
}: TechnicianOverviewProps) {
  const content = techniciansContent.overview

  if (loading) {
    return <TechniciansOverviewSkeleton />
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{content.title}</h1>
          <p className="mt-1 text-sm text-muted">{content.subtitle}</p>
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <p className="text-xs text-muted">{dateLabel}</p>
          {canMutate ? (
            <button type="button" onClick={onAdd} className={dashboardCtaClass}>
              <DashboardIcon name="plus" className="h-4 w-4" />
              {content.add}
            </button>
          ) : null}
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <article key={metric.label} className="rounded-xl border border-border bg-card px-4 py-4 shadow-sm">
            <p className="text-[10px] font-semibold tracking-wide text-muted uppercase">{metric.label}</p>
            <p className="mt-3 text-xl font-semibold text-foreground">
              {metric.accent ? (
                <span className="mr-3 inline-block h-2 w-2 rounded-full bg-success" />
              ) : null}
              {metric.value}
            </p>
          </article>
        ))}
      </section>

      {error ? (
        <div className="rounded-xl border border-border bg-card px-4 py-10 text-center text-sm text-muted">
          <p>{error}</p>
          {onRetry ? (
            <button type="button" className={cn(dashboardCtaClass, 'mt-3')} onClick={onRetry}>
              Retry
            </button>
          ) : null}
        </div>
      ) : technicians.length === 0 ? (
        <p className="rounded-xl border border-border bg-card px-4 py-10 text-center text-sm text-muted">
          No technicians yet. Add your first team member.
        </p>
      ) : (
        <section className="space-y-4">
          {technicians.map((technician) => (
            <TechnicianCard
              key={technician.id}
              technician={technician}
              onDetails={() => onDetails(technician.id)}
              onConversation={() => onConversation(technician.id)}
            />
          ))}
        </section>
      )}
    </div>
  )
}

function TechnicianCard({
  technician,
  onDetails,
  onConversation,
}: {
  technician: TechnicianRecord
  onDetails: () => void
  onConversation: () => void
}) {
  const content = techniciansContent.overview
  const todayCompleted = technician.rounds.reduce((sum, round) => sum + round.completed, 0)
  const todayTotal = technician.rounds.reduce((sum, round) => sum + round.stops, 0)

  return (
    <article className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
            {technician.initials}
          </span>
          <div>
            <h2 className="text-base font-semibold text-foreground">{technician.name}</h2>
            <p className="text-xs text-muted">{technician.role}</p>
          </div>
        </div>
        <StatusBadge status={technician.status} appStatus={technician.appStatus} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 border-y border-border py-4 lg:grid-cols-4">
        <Metric label="Rounds" value={String(technician.rounds.length)} />
        <Metric
          label="Today's jobs"
          value={todayTotal > 0 ? `${todayCompleted} / ${todayTotal}` : '—'}
          valueClass="text-primary"
        />
        <Metric
          label="Areas"
          value={technician.areas.length > 0 ? String(technician.areas.length) : '—'}
        />
        <Metric
          label="App status"
          value={
            technician.appStatus === 'PENDING_INVITE'
              ? 'Pending'
              : technician.appStatus === 'INACTIVE'
                ? 'Inactive'
                : 'Active'
          }
        />
      </div>

      {technician.rounds.length > 0 ? (
        <div className="mt-4">
          <p className="text-sm font-semibold text-foreground">
            {content.assignedRounds}
            <span className="ml-2 rounded-full bg-foreground px-2 py-0.5 text-[10px] text-card">
              {technician.rounds.length}
            </span>
          </p>
          <div className="mt-3 space-y-3">
            {technician.rounds.map((round) => (
              <div
                key={round.id}
                className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3 text-sm"
              >
                <p className="font-medium text-foreground">
                  {round.name}
                  {round.stops > 0 ? (
                    <span className="ml-3 text-xs font-normal text-muted">{round.stops} stops</span>
                  ) : null}
                </p>
                <StatusBadge status={round.status} />
              </div>
            ))}
          </div>
        </div>
      ) : technician.areas.length > 0 ? (
        <div className="mt-4">
          <p className="text-sm font-semibold text-foreground">Service areas</p>
          <p className="mt-2 text-sm text-muted">{technician.areas.join(', ')}</p>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-muted">
        <span className="inline-flex items-center gap-1">
          <DashboardIcon name="phone" className="h-3.5 w-3.5" />
          {technician.phone}
        </span>
        <span>·</span>
        <span className="inline-flex items-center gap-1">
          <DashboardIcon name="mail" className="h-3.5 w-3.5" />
          {technician.email}
        </span>
        {technician.areas.map((area) => (
          <span key={area} className="inline-flex items-center gap-1">
            <span>·</span>
            <DashboardIcon name="map-pin" className="h-3.5 w-3.5 text-danger" />
            {area}
          </span>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={onConversation}
          className={cn(dashboardCtaClass, 'px-4 py-2 text-xs')}
        >
          {content.sendMessage}
        </button>
        <button
          type="button"
          onClick={onDetails}
          className={cn('text-xs font-medium text-muted underline hover:text-foreground', dashboardPressableClass)}
        >
          {content.viewDetails}
        </button>
        <button
          type="button"
          onClick={onConversation}
          className={cn('text-xs font-medium text-muted underline hover:text-foreground', dashboardPressableClass)}
        >
          {content.viewPhotos}
        </button>
      </div>
    </article>
  )
}

interface TechnicianDetailProps {
  technician: TechnicianRecord
  loading?: boolean
  canMutate?: boolean
  onBack: () => void
  onEdit: () => void
  onConversation: () => void
}

export function TechnicianDetail({
  technician,
  loading = false,
  canMutate = true,
  onBack,
  onEdit,
  onConversation,
}: TechnicianDetailProps) {
  const content = techniciansContent.detail
  const remainingToday = technician.rounds.reduce(
    (sum, round) => sum + Math.max(0, round.stops - round.completed),
    0,
  )

  return (
    <div className="animate-slide-in-right space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <button type="button" onClick={onBack} className="inline-flex items-center gap-1 text-xs text-muted hover:text-foreground">
            <DashboardIcon name="chevron-left" className="h-3.5 w-3.5" />
            {content.back}
          </button>
          <h1 className="mt-2 text-2xl font-semibold text-foreground">{technician.name}</h1>
          <p className="mt-1 text-sm text-muted">
            {technician.role}
            {technician.areas[0] ? ` · ${technician.areas[0]}` : ''}
            {technician.phone !== '—' ? ` · ${technician.phone}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={technician.status} appStatus={technician.appStatus} />
          <button type="button" onClick={onConversation} className={dashboardCtaClass}>
            {content.sendMessage}
          </button>
        </div>
      </header>

      {loading ? (
        <p className="text-sm text-muted">Refreshing technician details…</p>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.7fr)_minmax(18rem,0.9fr)]">
        <div className="space-y-5">
          <Panel title={content.activity}>
            {technician.rounds.length === 0 ? (
              <p className="text-sm text-muted">No rounds assigned for today.</p>
            ) : (
              <div className="space-y-3">
                {technician.rounds.map((round, index) => (
                  <div key={round.id} className="flex flex-wrap items-center justify-between gap-3 text-sm">
                    <p className="inline-flex items-center gap-3 font-medium text-foreground">
                      <span className={cn('h-2 w-2 rounded-full', index ? 'bg-primary' : 'bg-success')} />
                      {round.name}
                      {round.stops > 0 ? (
                        <span className="font-normal text-muted">
                          {round.completed}/{round.stops} completed
                        </span>
                      ) : null}
                    </p>
                    <StatusBadge status={round.status} />
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel title={content.performance}>
            <p className="text-sm text-muted">
              Performance metrics are not available from the technicians API yet.
            </p>
          </Panel>
        </div>

        <div className="space-y-5">
          <Panel title={content.info}>
            <dl className="space-y-3 text-sm">
              <InfoRow label="Full Name" value={technician.name} />
              <InfoRow label="Role" value={technician.role} />
              <InfoRow label="Phone" value={technician.phone} />
              <InfoRow label="Email" value={technician.email} />
              <InfoRow
                label="Default Area"
                value={technician.areas.length > 0 ? technician.areas.join(', ') : '—'}
              />
              <InfoRow
                label="App Status"
                value={
                  technician.appStatus === 'PENDING_INVITE'
                    ? 'Pending invite'
                    : technician.appStatus === 'INACTIVE'
                      ? 'Inactive'
                      : 'Active'
                }
                valueClass="text-primary"
              />
              <InfoRow label="Member Since" value={technician.memberSince} />
              {technician.notes ? <InfoRow label="Notes" value={technician.notes} /> : null}
            </dl>
            {canMutate ? (
              <button type="button" onClick={onEdit} className="mt-4 block w-full text-right text-sm font-semibold underline">
                {content.edit}
              </button>
            ) : null}
          </Panel>

          <Panel title={content.workload}>
            {technician.rounds.length === 0 ? (
              <p className="text-sm text-muted">No workload today.</p>
            ) : (
              <div className="space-y-4">
                {technician.rounds.map((round) => {
                  const remaining = Math.max(0, round.stops - round.completed)
                  const percent =
                    round.stops > 0 ? Math.round((round.completed / round.stops) * 100) : 0
                  return (
                    <div key={round.id}>
                      <div className="flex justify-between gap-3 text-xs">
                        <span className="font-medium text-foreground">{round.name}</span>
                        <span className="text-muted">
                          {remaining} job{remaining === 1 ? '' : 's'}{' '}
                          {remaining === 1 ? 'left' : 'pending'}
                        </span>
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
                <p className="border-t border-border pt-4 text-sm font-semibold text-foreground">
                  Total: {remainingToday} job{remainingToday === 1 ? '' : 's'} remaining today
                </p>
              </div>
            )}
          </Panel>
        </div>
      </div>
    </div>
  )
}

function StatusBadge({
  status,
  appStatus,
}: {
  status: TechnicianRecord['status']
  appStatus?: TechnicianRecord['appStatus']
}) {
  const label =
    appStatus === 'PENDING_INVITE'
      ? 'Pending invite'
      : appStatus === 'INACTIVE'
        ? 'Inactive'
        : technicianStatusLabels[status]

  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
      <span className="h-2 w-2 rounded-full bg-primary" />
      {label}
    </span>
  )
}

function Metric({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold tracking-wide text-muted uppercase">{label}</p>
      <p className={cn('mt-2 text-lg font-semibold text-foreground', valueClass)}>{value}</p>
    </div>
  )
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  )
}

function InfoRow({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className={cn('text-right font-medium text-foreground', valueClass)}>{value}</dd>
    </div>
  )
}
