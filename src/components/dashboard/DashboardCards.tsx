import type { DashboardAlert, DashboardAlertId, DashboardMetric } from '@/content/dashboard'
import { DashboardIcon } from '@/components/dashboard/DashboardIcon'
import { PanelCard } from '@/components/dashboard/DashboardControls'
import {
  dashboardPressableClass,
  toneBgClass,
  toneBorderClass,
  toneTextClass,
} from '@/components/dashboard/dashboard-styles'
import { cn } from '@/lib/utils'

interface DashboardMetricGridProps {
  metrics: readonly DashboardMetric[]
}

/** Top-row KPI tiles with shared hover lift. */
export function DashboardMetricGrid({ metrics }: DashboardMetricGridProps) {
  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => (
        <PanelCard key={metric.label} className={toneBorderClass(metric.tone)}>
          <div className="flex items-start justify-between gap-3">
            <p className="text-xs font-medium tracking-wide text-muted uppercase">{metric.label}</p>
            <DashboardIcon name={metric.icon} className={cn('h-4 w-4', toneTextClass(metric.tone))} />
          </div>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{metric.value}</p>
          <p className="mt-2 text-xs font-semibold text-foreground">{metric.description}</p>
          {metric.trend ? (
            <p className={cn('mt-2 text-[11px] font-medium', toneTextClass(metric.tone))}>
              {metric.trend}
            </p>
          ) : null}
        </PanelCard>
      ))}
    </section>
  )
}

interface DashboardAlertRowProps {
  alerts: readonly DashboardAlert[]
  onOpenAlert: (id: DashboardAlertId) => void
}

/** Alert strip — click a card to open its detail modal. */
export function DashboardAlertRow({ alerts, onOpenAlert }: DashboardAlertRowProps) {
  return (
    <section className="grid gap-4 lg:grid-cols-3">
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
                  <span className="mr-2 text-base font-bold">{alert.value}</span>
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
