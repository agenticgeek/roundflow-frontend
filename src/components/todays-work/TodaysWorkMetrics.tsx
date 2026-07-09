import type { TodaysWorkMetric } from '@/content/todays-work'
import { PanelCard } from '@/components/dashboard/DashboardControls'
import { toneBgClass, toneBorderClass } from '@/components/dashboard/dashboard-styles'
import { cn } from '@/lib/utils'

interface TodaysWorkMetricsProps {
  metrics: readonly TodaysWorkMetric[]
}

/** Compact KPI strip for live round summary. */
export function TodaysWorkMetrics({ metrics }: TodaysWorkMetricsProps) {
  return (
    <section className="flex flex-wrap gap-3">
      {metrics.map((metric) => (
        <PanelCard
          key={metric.label}
          interactive={false}
          className={cn(
            'w-fit shrink-0 px-3 py-2.5',
            metric.tone ? toneBorderClass(metric.tone) : undefined,
            metric.tone ? toneBgClass(metric.tone) : undefined,
          )}
        >
          <p className="text-[11px] font-medium tracking-wide text-muted uppercase">{metric.label}</p>
          <p className="mt-0.5 text-base font-semibold tracking-tight text-foreground">{metric.value}</p>
        </PanelCard>
      ))}
    </section>
  )
}
