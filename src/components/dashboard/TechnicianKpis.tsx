import type { DashboardChartRange, DashboardPeriod, DashboardTechnicianKpi } from '@/api/dashboard.api'
import type { ChartBar, KpiMetric } from '@/content/dashboard'
import { dashboardContent } from '@/content/dashboard'
import { FilterChip, PanelCard, SegmentToggle } from '@/components/dashboard/DashboardControls'
import { DashboardBarChart } from '@/components/dashboard/DashboardCharts'
import { DashboardIcon } from '@/components/dashboard/DashboardIcon'
import { toneTextClass } from '@/components/dashboard/dashboard-styles'
import { Skeleton } from '@/components/ui/skeleton'
import { formatMoney } from '@/features/dashboard/lib/mappers'
import { cn } from '@/lib/utils'

interface TechnicianKpisProps {
  technicians: readonly DashboardTechnicianKpi[]
  techniciansLoading: boolean
  selectedTechnicianIds: ReadonlySet<string>
  onToggleTechnician: (technicianId: string) => void
  period: DashboardPeriod
  onPeriodChange: (period: DashboardPeriod) => void
  metrics: readonly KpiMetric[]
  range: DashboardChartRange
  onRangeChange: (range: DashboardChartRange) => void
  valueChart: readonly ChartBar[]
  issueChart: readonly ChartBar[]
  chartsLoading: boolean
}

/** Single KPI tile — uses shared PanelCard hover. */
function KpiCard({ metric, loading }: { metric: KpiMetric; loading: boolean }) {
  return (
    <PanelCard>
      <p className="text-xs font-medium text-muted">{metric.label}</p>
      {loading ? (
        <Skeleton className="mt-2 h-8 w-20" />
      ) : (
        <p className={cn('mt-2 text-2xl font-semibold tracking-tight text-foreground', toneTextClass(metric.tone))}>
          {metric.value}
        </p>
      )}
      <p className={cn('mt-2 text-xs font-semibold', metric.tone === 'success' ? 'text-success' : 'text-foreground')}>
        {metric.detail}
      </p>
    </PanelCard>
  )
}

/**
 * Technician performance — GET /dashboard/technician-kpis (period toggle) and
 * GET /dashboard/charts (range toggle). Chips filter the tiles client-side.
 */
export function TechnicianKpis({
  technicians,
  techniciansLoading,
  selectedTechnicianIds,
  onToggleTechnician,
  period,
  onPeriodChange,
  metrics,
  range,
  onRangeChange,
  valueChart,
  issueChart,
  chartsLoading,
}: TechnicianKpisProps) {
  const { kpis } = dashboardContent
  const dotClasses = ['bg-accent', 'bg-accent/70', 'bg-primary', 'bg-success']

  const periodLabels = kpis.periodOptions.map((option) => option.label)
  const periodLabel = kpis.periodOptions.find((option) => option.value === period)?.label ?? periodLabels[0]
  const rangeLabels = kpis.charts.rangeOptions.map((option) => option.label)
  const rangeLabel = kpis.charts.rangeOptions.find((option) => option.value === range)?.label ?? rangeLabels[0]

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">{kpis.title}</h2>
          <p className="mt-1 text-sm text-muted">{kpis.subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {techniciansLoading ? (
              <>
                <Skeleton className="h-8 w-20 rounded-full" />
                <Skeleton className="h-8 w-20 rounded-full" />
              </>
            ) : technicians.length === 0 ? (
              <span className="text-xs text-muted">{kpis.noTechnicians}</span>
            ) : (
              technicians.map((technician, index) => (
                <FilterChip
                  key={technician.technicianId}
                  label={technician.technicianName}
                  active={selectedTechnicianIds.size === 0 || selectedTechnicianIds.has(technician.technicianId)}
                  dotClass={dotClasses[index % dotClasses.length]}
                  onClick={() => onToggleTechnician(technician.technicianId)}
                />
              ))
            )}
          </div>

          <SegmentToggle
            options={periodLabels}
            value={periodLabel}
            onChange={(label) => {
              const next = kpis.periodOptions.find((option) => option.label === label)
              if (next) onPeriodChange(next.value)
            }}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <KpiCard key={metric.label} metric={metric} loading={techniciansLoading} />
        ))}
      </div>

      <div className="rounded-xl border border-border bg-background p-4 shadow-sm sm:p-5">
        <div className="mb-6 flex justify-end">
          <SegmentToggle
            options={rangeLabels}
            value={rangeLabel}
            onChange={(label) => {
              const next = kpis.charts.rangeOptions.find((option) => option.label === label)
              if (next) onRangeChange(next.value)
            }}
          />
        </div>
        <div className="space-y-8">
          <div>
            <h3 className="text-base font-medium text-foreground">{kpis.charts.valueTitle}</h3>
            <DashboardBarChart
              data={valueChart}
              valueFormatter={formatMoney}
              loading={chartsLoading}
              emptyCopy={kpis.charts.noData}
            />
          </div>
          <div>
            <h3 className="text-base font-medium text-foreground">{kpis.charts.issuesTitle}</h3>
            <DashboardBarChart
              data={issueChart}
              barClassName="bg-danger"
              loading={chartsLoading}
              emptyCopy={kpis.charts.noData}
            />
          </div>
          <div>
            <h3 className="text-base font-medium text-foreground">{kpis.charts.revenueTitle}</h3>
            {/* revenuePerHour is always null until time tracking exists (Phase 2). */}
            <p className="mt-3 flex items-center gap-2 rounded-lg border border-dashed border-border px-4 py-6 text-sm text-muted">
              <DashboardIcon name="info" className="h-4 w-4 shrink-0" />
              {kpis.charts.revenueUnavailable}
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
