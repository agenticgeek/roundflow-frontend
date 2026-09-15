import type { DashboardAlert, DashboardAlertId, DashboardMetric } from '@/content/dashboard'
import { DashboardIcon } from '@/components/dashboard/DashboardIcon'
import { PanelCard } from '@/components/dashboard/DashboardControls'
import {
  dashboardPressableClass,
  toneBgClass,
  toneBorderClass,
  toneTextClass,
} from '@/components/dashboard/dashboard-styles'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

interface DashboardMetricGridProps {
  metrics: readonly DashboardMetric[]
  loading?: boolean
}

/** Top-row KPI tiles — GET /dashboard/kpis. */
export function DashboardMetricGrid({ metrics, loading = false }: DashboardMetricGridProps) {
  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-busy={loading}>
      {metrics.map((metric) => (
        <PanelCard key={metric.label} className={toneBorderClass(metric.tone)}>
          <div className="flex items-start justify-between gap-3">
            <p className="text-xs font-medium tracking-wide text-muted uppercase">{metric.label}</p>
            <DashboardIcon name={metric.icon} className={cn('h-4 w-4', toneTextClass(metric.tone))} />
          </div>
          {loading ? (
            <Skeleton className="mt-2 h-8 w-24" />
          ) : (
            <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{metric.value}</p>
          )}
          <p className="mt-2 text-xs font-semibold text-foreground">{metric.description}</p>
        </PanelCard>
      ))}
    </section>
  )
}

interface DashboardAlertRowProps {
  alerts: readonly DashboardAlert[]
  loading?: boolean
  onOpenAlert: (id: DashboardAlertId) => void
}

/** Alert strip — GET /dashboard/alerts. Each card jumps to the screen where the work happens. */
export function DashboardAlertRow({ alerts, loading = false, onOpenAlert }: DashboardAlertRowProps) {
  return (
    <section className="grid gap-4 lg:grid-cols-3" aria-busy={loading}>
      {alerts.map((alert) => (
        <button
          key={alert.id}
          type="button"
          onClick={() => onOpenAlert(alert.id)}
          className={cn(
            'flex flex-col rounded-xl border bg-background px-4 py-3 text-left shadow-sm transition-all duration-200 hover:bg-surface hover:shadow-md',
            dashboardPressableClass,
            toneBorderClass(alert.tone),
          )}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                  toneBgClass(alert.tone),
                  toneTextClass(alert.tone),
                )}
              >
                <DashboardIcon name={alert.icon} className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {loading || alert.value === undefined ? (
                    <Skeleton className="mr-2 inline-block h-4 w-6 align-middle" />
                  ) : (
                    <span className="mr-2 text-base font-bold">{alert.value}</span>
                  )}
                  {alert.label}
                </p>
                <p className="text-[11px] font-medium tracking-wide text-muted uppercase">
                  {alert.description}
                </p>
              </div>
            </div>
            <DashboardIcon name="chevron" className="h-4 w-4 rotate-180 text-muted" />
          </div>
        </button>
      ))}
    </section>
  )
}
