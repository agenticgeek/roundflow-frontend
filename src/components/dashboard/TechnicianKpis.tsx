import type { ChartBar, IssueBar, KpiMetric } from '@/content/dashboard'
import { FilterChip, PanelCard, SegmentToggle } from '@/components/dashboard/DashboardControls'
import {
  DashboardBarChart,
  DashboardIssueChart,
  DashboardLineChart,
} from '@/components/dashboard/DashboardCharts'
import { toneTextClass } from '@/components/dashboard/dashboard-styles'
import { cn } from '@/lib/utils'

interface TechnicianKpisProps {
  title: string
  subtitle: string
  filters: readonly string[]
  periodOptions: readonly string[]
  period: string
  onPeriodChange: (period: string) => void
  selectedTechnicians: ReadonlySet<string>
  onToggleTechnician: (name: string) => void
  metrics: readonly KpiMetric[]
  valueChartTitle: string
  revenueChartTitle: string
  issuesChartTitle: string
  valueChart: readonly ChartBar[]
  revenueLine: readonly ChartBar[]
  issueChart: readonly IssueBar[]
}

/** Technician filter chips + period toggle row. */
function TechnicianFilters({
  filters,
  periodOptions,
  period,
  onPeriodChange,
  selectedTechnicians,
  onToggleTechnician,
}: Pick<
  TechnicianKpisProps,
  | 'filters'
  | 'periodOptions'
  | 'period'
  | 'onPeriodChange'
  | 'selectedTechnicians'
  | 'onToggleTechnician'
>) {
  const dotClasses = ['bg-accent', 'bg-accent/70']

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex gap-2">
        {filters.map((filter, index) => (
          <FilterChip
            key={filter}
            label={filter}
            active={selectedTechnicians.has(filter)}
            dotClass={dotClasses[index % dotClasses.length]}
            onClick={() => onToggleTechnician(filter)}
          />
        ))}
      </div>

      <SegmentToggle options={periodOptions} value={period} onChange={onPeriodChange} />
    </div>
  )
}

/** Single KPI tile — uses shared PanelCard hover. */
function KpiCard({ metric }: { metric: KpiMetric }) {
  return (
    <PanelCard>
      <p className="text-xs font-medium text-muted">{metric.label}</p>
      <p className={cn('mt-2 text-2xl font-semibold tracking-tight text-foreground', toneTextClass(metric.tone))}>
        {metric.value}
      </p>
      <p className={cn('mt-2 text-xs font-semibold', metric.tone === 'success' ? 'text-success' : 'text-foreground')}>
        {metric.detail}
      </p>
    </PanelCard>
  )
}

/** KPI section with interactive filters and tooltip-enabled charts. */
export function TechnicianKpis({
  title,
  subtitle,
  filters,
  periodOptions,
  period,
  onPeriodChange,
  selectedTechnicians,
  onToggleTechnician,
  metrics,
  valueChartTitle,
  revenueChartTitle,
  issuesChartTitle,
  valueChart,
  revenueLine,
  issueChart,
}: TechnicianKpisProps) {
  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h2>
          <p className="mt-1 text-sm text-muted">{subtitle}</p>
        </div>
        <TechnicianFilters
          filters={filters}
          periodOptions={periodOptions}
          period={period}
          onPeriodChange={onPeriodChange}
          selectedTechnicians={selectedTechnicians}
          onToggleTechnician={onToggleTechnician}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {metrics.map((metric) => (
          <KpiCard key={metric.label} metric={metric} />
        ))}
      </div>

      <div className="rounded-xl border border-border bg-background p-4 shadow-sm sm:p-5">
        <div className="space-y-8">
          <div>
            <h3 className="text-base font-medium text-foreground">{valueChartTitle}</h3>
            <DashboardBarChart data={valueChart} valueFormatter={(value) => `£${value * 25}`} />
          </div>
          <div>
            <h3 className="text-base font-medium text-foreground">{revenueChartTitle}</h3>
            <DashboardLineChart data={revenueLine} valueFormatter={(value) => `£${(value / 4).toFixed(2)}/hr`} />
          </div>
          <div>
            <h3 className="text-base font-medium text-foreground">{issuesChartTitle}</h3>
            <DashboardIssueChart data={issueChart} />
          </div>
        </div>
      </div>
    </section>
  )
}
