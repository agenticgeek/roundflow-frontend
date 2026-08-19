import type { TechnicianRecord } from '@/content/technicians'
import { technicianStatusLabels, techniciansContent } from '@/content/technicians'
import { DashboardIcon } from '@/components/dashboard/DashboardIcon'
import { dashboardCtaClass, dashboardPressableClass } from '@/components/dashboard/dashboard-styles'
import { cn } from '@/lib/utils'

interface TechnicianOverviewProps {
  technicians: readonly TechnicianRecord[]
  onAdd: () => void
  onDetails: (id: string) => void
  onConversation: (id: string) => void
}

export function TechnicianOverview({
  technicians,
  onAdd,
  onDetails,
  onConversation,
}: TechnicianOverviewProps) {
  const content = techniciansContent.overview

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{content.title}</h1>
          <p className="mt-1 text-sm text-muted">{content.subtitle}</p>
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <p className="text-xs text-muted">{content.date}</p>
          <button type="button" onClick={onAdd} className={dashboardCtaClass}>
            <DashboardIcon name="plus" className="h-4 w-4" />
            {content.add}
          </button>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {content.metrics.map((metric) => (
          <article key={metric.label} className="rounded-xl border border-border bg-card px-4 py-4 shadow-sm">
            <p className="text-[10px] font-semibold tracking-wide text-muted uppercase">{metric.label}</p>
            <p className="mt-3 text-xl font-semibold text-foreground">
              {'accent' in metric && metric.accent ? (
                <span className="mr-3 inline-block h-2 w-2 rounded-full bg-success" />
              ) : null}
              {metric.value}
            </p>
          </article>
        ))}
      </section>

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

  return (
    <article className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
            {technician.initials}
          </span>
          <div>
            <h2 className="text-base font-semibold text-foreground">{technician.name.split(' ')[0]}</h2>
            <p className="text-xs text-muted">{technician.role}</p>
          </div>
        </div>
        <StatusBadge status={technician.status} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 border-y border-border py-4 lg:grid-cols-4">
        <Metric label="Rounds" value={String(technician.rounds.length)} />
        <Metric
          label="Today's jobs"
          value={`${technician.rounds.reduce((sum, round) => sum + round.completed, 0)} / ${technician.rounds.reduce((sum, round) => sum + round.stops, 0)}`}
          valueClass="text-primary"
        />
        <Metric label="Issues" value={String(technician.issues)} valueClass="text-danger" />
        <Metric label="Revenue" value={technician.revenue} />
      </div>

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
                <span className="ml-3 text-xs font-normal text-muted">{round.stops} stops</span>
              </p>
              <div className="flex items-center gap-5">
                <StatusBadge status={round.status} />
                <span className="font-medium text-foreground">{round.revenue}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

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
        <span>·</span>
        {technician.areas.map((area) => (
          <span key={area} className="inline-flex items-center gap-1">
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
  onBack: () => void
  onEdit: () => void
  onConversation: () => void
}

export function TechnicianDetail({
  technician,
  onBack,
  onEdit,
  onConversation,
}: TechnicianDetailProps) {
  const content = techniciansContent.detail

  return (
    <div className="animate-slide-in-right space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <button type="button" onClick={onBack} className="inline-flex items-center gap-1 text-xs text-muted hover:text-foreground">
            <DashboardIcon name="chevron-left" className="h-3.5 w-3.5" />
            {content.back}
          </button>
          <h1 className="mt-2 text-2xl font-semibold text-foreground">{technician.name.split(' ')[0]}</h1>
          <p className="mt-1 text-sm text-muted">
            {technician.role} · {technician.areas[0]} · {technician.phone}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={technician.status} />
          <button type="button" onClick={onConversation} className={dashboardCtaClass}>
            {content.sendMessage}
          </button>
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.7fr)_minmax(18rem,0.9fr)]">
        <div className="space-y-5">
          <Panel title={content.activity}>
            <div className="space-y-3">
              {technician.rounds.map((round, index) => (
                <div key={round.id} className="flex flex-wrap items-center justify-between gap-3 text-sm">
                  <p className="inline-flex items-center gap-3 font-medium text-foreground">
                    <span className={cn('h-2 w-2 rounded-full', index ? 'bg-primary' : 'bg-success')} />
                    {round.name}
                    <span className="font-normal text-muted">
                      {round.completed}/{round.stops} completed
                    </span>
                  </p>
                  <div className="flex items-center gap-6">
                    <StatusBadge status={round.status} />
                    <span className="font-medium">{round.revenue}</span>
                  </div>
                </div>
              ))}
              <p className="inline-flex items-center gap-2 text-sm font-medium text-danger">
                <DashboardIcon name="alert" className="h-4 w-4" />
                {content.issueFlagged}
              </p>
            </div>
          </Panel>

          <Panel title={content.performance}>
            <div className="grid gap-3 sm:grid-cols-3">
              <MetricCard label="Value completed" value={technician.valueCompleted} />
              <MetricCard label="Time on job" value={technician.timeOnJob} />
              <MetricCard label="Revenue / hour" value={technician.revenuePerHour} />
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <MetricCard label="Complaints" value={String(technician.complaints)} valueClass="text-warning" />
              <MetricCard label="Issues" value={String(technician.issues)} valueClass="text-danger" />
            </div>
          </Panel>
        </div>

        <div className="space-y-5">
          <Panel title={content.info}>
            <dl className="space-y-3 text-sm">
              <InfoRow label="Full Name" value={technician.name} />
              <InfoRow label="Role" value={technician.role} />
              <InfoRow label="Phone" value={technician.phone} />
              <InfoRow label="Email" value={technician.email} />
              <InfoRow label="Default Area" value={technician.areas.join(', ')} />
              <InfoRow label="App Status" value={technician.appActive ? '✓ Active' : 'Inactive'} valueClass="text-primary" />
              <InfoRow label="Member Since" value={technician.memberSince} />
            </dl>
            <button type="button" onClick={onEdit} className="mt-4 block w-full text-right text-sm font-semibold underline">
              {content.edit}
            </button>
          </Panel>

          <Panel title={content.workload}>
            <div className="space-y-4">
              {technician.rounds.map((round) => {
                const remaining = round.stops - round.completed
                const percent = Math.round((round.completed / round.stops) * 100)
                return (
                  <div key={round.id}>
                    <div className="flex justify-between gap-3 text-xs">
                      <span className="font-medium text-foreground">{round.name}</span>
                      <span className="text-muted">{remaining} jobs {remaining === 1 ? 'left' : 'pending'}</span>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface">
                      <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                )
              })}
              <p className="border-t border-border pt-4 text-sm font-semibold text-foreground">
                Total: 8 jobs remaining today
              </p>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: TechnicianRecord['status'] }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
      <span className="h-2 w-2 rounded-full bg-primary" />
      {technicianStatusLabels[status]}
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

function MetricCard({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="rounded-xl border border-border p-4">
      <p className="text-[10px] font-semibold tracking-wide text-muted uppercase">{label}</p>
      <p className={cn('mt-2 text-xl font-semibold text-foreground', valueClass)}>{value}</p>
    </div>
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
