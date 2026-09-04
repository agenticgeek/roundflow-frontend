import type { RoundPlannerMetric } from '@/content/round-planner'
import { PanelCard } from '@/components/dashboard/DashboardControls'
import { toneBorderClass } from '@/components/dashboard/dashboard-styles'
import { cn } from '@/lib/utils'

interface RoundPlannerMetricsProps {
  metrics: readonly RoundPlannerMetric[]
  loading?: boolean
}

/** Summary KPI strip above the calendar — sums across the visible window. */
export function RoundPlannerMetrics({ metrics, loading = false }: RoundPlannerMetricsProps) {
  return (
    <section className="flex flex-wrap gap-3" aria-busy={loading}>
      {metrics.map((metric) => (
        <PanelCard
          key={metric.label}
          interactive={false}
          className={cn(
            'w-fit shrink-0 px-3 py-2.5',
            metric.tone ? toneBorderClass(metric.tone) : undefined,
          )}
        >
          <p className="text-[11px] font-medium tracking-wide text-muted uppercase">
            {metric.label}
            {metric.hint ? <span className="ml-1 normal-case tracking-normal">({metric.hint})</span> : null}
          </p>
          <p
            className={cn(
              'mt-0.5 text-base font-semibold tracking-tight text-foreground',
              loading && 'animate-pulse text-muted',
            )}
          >
            {metric.value}
          </p>
        </PanelCard>
      ))}
    </section>
  )
}
