import { useMemo, useRef, useState, type MouseEvent } from 'react'
import type {
  ActivityLogItem,
  ReportsPeriod,
  RevenuePoint,
  TechnicianPerformanceRow,
  VisitHistoryRow,
  VisitStatus,
} from '@/content/reports'
import { reportsContent } from '@/content/reports'
import { DashboardIcon } from '@/components/dashboard/DashboardIcon'
import { PanelCard } from '@/components/dashboard/DashboardControls'
import {
  dashboardCtaClass,
  dashboardPressableClass,
  dashboardRowHoverClass,
} from '@/components/dashboard/dashboard-styles'
import {
  ChartTooltip,
  emptyChartTooltip,
  getChartTooltipPosition,
  type ChartTooltipState,
} from '@/components/dashboard/ChartTooltip'
import { Select } from '@/components/ui'
import { cn } from '@/lib/utils'

const VISIT_STATUS_CLASS: Record<VisitStatus, string> = {
  completed: 'border-success/40 bg-success/5 text-success',
  skipped: 'border-danger/40 bg-danger/5 text-danger',
  'in-progress': 'border-success/40 bg-success/5 text-success',
  pending: 'border-success/40 bg-success/5 text-success',
}

type FocusedReport = 'technicians' | 'visits' | 'activity'

/** Reports & History — KPI strip, revenue chart, performance tables, and activity log. */
export function ReportsScreen() {
  const [period, setPeriod] = useState<ReportsPeriod>('Daily')
  const [statusFilter, setStatusFilter] = useState('all')
  const [focusedReport, setFocusedReport] = useState<FocusedReport | null>(null)

  const filteredVisits = useMemo(() => {
    if (statusFilter === 'all') return reportsContent.visits
    return reportsContent.visits.filter((visit) => visit.status === statusFilter)
  }, [statusFilter])

  if (focusedReport) {
    return (
      <div key={focusedReport} className="animate-slide-in-right space-y-5">
        <ReportsHeader statusFilter={statusFilter} onStatusFilterChange={setStatusFilter} />

        {focusedReport === 'technicians' ? (
          <TechnicianPerformanceCard
            rows={reportsContent.technicians}
            onBack={() => setFocusedReport(null)}
          />
        ) : null}

        {focusedReport === 'visits' ? (
          <VisitHistoryCard
            rows={filteredVisits}
            onBack={() => setFocusedReport(null)}
          />
        ) : null}

        {focusedReport === 'activity' ? (
          <SystemActivityLogCard
            items={reportsContent.activity}
            onBack={() => setFocusedReport(null)}
          />
        ) : null}
      </div>
    )
  }

  return (
    <div className="animate-fade-in space-y-5">
      <ReportsHeader statusFilter={statusFilter} onStatusFilterChange={setStatusFilter} />

      <ReportsMetricGrid />

      <RevenueOverviewCard
        period={period}
        onPeriodChange={setPeriod}
        data={reportsContent.revenueByPeriod[period]}
      />

      <TechnicianPerformanceCard
        rows={reportsContent.technicians.slice(0, 2)}
        onViewAll={() => setFocusedReport('technicians')}
      />

      <VisitHistoryCard
        rows={filteredVisits.slice(0, 3)}
        onViewAll={() => setFocusedReport('visits')}
      />

      <SystemActivityLogCard
        items={reportsContent.activity.slice(0, 4)}
        onViewAll={() => setFocusedReport('activity')}
      />
    </div>
  )
}

function ReportsHeader({
  statusFilter,
  onStatusFilterChange,
}: {
  statusFilter: string
  onStatusFilterChange: (value: string) => void
}) {
  return (
    <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {reportsContent.title}
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">{reportsContent.subtitle}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <div className="flex items-center gap-1.5 text-sm text-muted">
          <DashboardIcon name="refresh" className="h-4 w-4" />
          <span>{reportsContent.cycleLabel}</span>
        </div>

        <Select
          inputSize="sm"
          value={statusFilter}
          onChange={(event) => onStatusFilterChange(event.target.value)}
          options={[...reportsContent.statusFilter.options]}
          aria-label={reportsContent.statusFilter.label}
          className="min-w-[7.5rem] rounded-lg border-border bg-accent-surface/60"
        />

        <button type="button" className={dashboardCtaClass}>
          <DashboardIcon name="upload" className="h-4 w-4" />
          {reportsContent.exportLabel}
        </button>
      </div>
    </header>
  )
}

function ReportsMetricGrid() {
  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {reportsContent.metrics.map((metric) => (
        <article
          key={metric.id}
          className="rounded-xl border border-transparent bg-accent-surface px-4 py-4"
        >
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-medium text-muted">{metric.label}</p>
            <DashboardIcon name={metric.icon} className="h-4 w-4 text-foreground" />
          </div>
          <p className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
            {metric.value}
          </p>
          <p
            className={cn(
              'mt-2 text-xs font-medium',
              metric.trendPositive ? 'text-success' : 'text-danger',
            )}
          >
            {metric.trend}
          </p>
        </article>
      ))}
    </section>
  )
}

function RevenueOverviewCard({
  period,
  onPeriodChange,
  data,
}: {
  period: ReportsPeriod
  onPeriodChange: (period: ReportsPeriod) => void
  data: readonly RevenuePoint[]
}) {
  return (
    <PanelCard interactive={false} className="p-5">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-base font-semibold text-foreground">
          {reportsContent.sections.revenueOverview}
        </h2>
        <div className="inline-flex rounded-lg bg-surface p-1">
          {reportsContent.periods.map((option) => {
            const active = option === period
            return (
              <button
                key={option}
                type="button"
                aria-pressed={active}
                onClick={() => onPeriodChange(option)}
                className={cn(
                  'rounded-md px-3 py-1.5 text-xs font-semibold transition-colors duration-150',
                  dashboardPressableClass,
                  active
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted hover:text-foreground',
                )}
              >
                {option}
              </button>
            )
          })}
        </div>
      </div>
      <RevenueLineChart data={data} />
    </PanelCard>
  )
}

function RevenueLineChart({ data }: { data: readonly RevenuePoint[] }) {
  const rootRef = useRef<HTMLDivElement>(null)
  const [tooltip, setTooltip] = useState<ChartTooltipState>(emptyChartTooltip())

  const width = 1000
  const height = 238
  const padX = 58
  const padTop = 18
  const padBottom = 34
  const maxValue = 150_000
  const yTicks = [25_000, 50_000, 75_000, 100_000, 125_000, 150_000]
  const chartBottom = height - padBottom

  const points = data.map((item, index) => {
    const x = padX + (index / Math.max(data.length - 1, 1)) * (width - padX - 18)
    const y = padTop + (1 - item.value / maxValue) * (chartBottom - padTop)
    return { ...item, x, y }
  })

  const path = buildSmoothPath(points)
  const areaPath = `${path} L ${points.at(-1)?.x ?? padX} ${chartBottom} L ${points[0]?.x ?? padX} ${chartBottom} Z`

  function showTooltip(event: MouseEvent<Element>, label: string, value: number) {
    if (!rootRef.current) return
    const { x, y } = getChartTooltipPosition(event, rootRef.current)
    setTooltip({
      visible: true,
      label,
      value: formatRevenue(value),
      x,
      y,
    })
  }

  return (
    <div ref={rootRef} data-chart-root className="relative overflow-visible rounded-lg">
      <ChartTooltip tooltip={tooltip} />
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Revenue trend from January to December"
        className="h-[250px] w-full overflow-visible"
      >
        <defs>
          <linearGradient
            id="reports-revenue-area"
            x1="0"
            y1="0"
            x2="0"
            y2="1"
            className="text-primary"
          >
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.2" />
            <stop offset="65%" stopColor="currentColor" stopOpacity="0.05" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
          <filter id="reports-revenue-glow" x="-10%" y="-30%" width="120%" height="160%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {yTicks.map((tick) => {
          const y = padTop + (1 - tick / maxValue) * (chartBottom - padTop)
          return (
            <g key={tick}>
              <line
                x1={padX}
                x2={width - 18}
                y1={y}
                y2={y}
                stroke="currentColor"
                strokeDasharray="5 7"
                className="text-border/70"
              />
              <text
                x={padX - 10}
                y={y + 4}
                textAnchor="end"
                className="fill-muted text-[12px]"
              >
                {tick / 1000}K
              </text>
            </g>
          )
        })}

        <path d={areaPath} fill="url(#reports-revenue-area)" className="text-primary" />

        <path
          d={path}
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#reports-revenue-glow)"
          className="text-primary"
        />

        {points.map((point, index) => {
          const previousX = points[index - 1]?.x ?? point.x
          const nextX = points[index + 1]?.x ?? point.x
          const hitWidth = index === 0
            ? nextX - point.x
            : index === points.length - 1
              ? point.x - previousX
              : (nextX - previousX) / 2

          return (
            <rect
              key={point.label}
              x={point.x - hitWidth / 2}
              y={padTop}
              width={hitWidth}
              height={chartBottom - padTop}
              fill="transparent"
              className="cursor-crosshair"
              onMouseEnter={(event) => showTooltip(event, point.label, point.value)}
              onMouseMove={(event) => showTooltip(event, point.label, point.value)}
              onMouseLeave={() => setTooltip(emptyChartTooltip())}
            />
          )
        })}

        {points.map((point) => (
          <text
            key={`label-${point.label}`}
            x={point.x}
            y={height - 9}
            textAnchor="middle"
            className="fill-muted text-[12px]"
          >
            {point.label}
          </text>
        ))}
      </svg>
    </div>
  )
}

function TechnicianPerformanceCard({
  rows,
  onViewAll,
  onBack,
}: {
  rows: readonly TechnicianPerformanceRow[]
  onViewAll?: () => void
  onBack?: () => void
}) {
  return (
    <PanelCard interactive={false} className="overflow-hidden p-0">
      <div className="flex items-center justify-between gap-3 px-5 py-4">
        <h2 className="text-base font-semibold text-foreground">
          {reportsContent.sections.technicianPerformance}
        </h2>
        {onViewAll ? <ViewAllButton onClick={onViewAll} /> : null}
        {onBack ? <OverviewButton onClick={onBack} /> : null}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-y border-border text-xs font-medium text-muted">
              <th className="px-5 py-3 font-medium">Technician</th>
              <th className="px-5 py-3 font-medium">Completed</th>
              <th className="px-5 py-3 font-medium">Skipped</th>
              <th className="px-5 py-3 font-medium">Efficiency</th>
              <th className="px-5 py-3 font-medium">Revenue Impact</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className={cn('border-b border-border last:border-b-0', dashboardRowHoverClass)}>
                <td className="px-5 py-3.5">
                  <p className="font-semibold text-foreground">{row.name}</p>
                  <p className="text-xs text-muted">{row.email}</p>
                </td>
                <td className="px-5 py-3.5 text-foreground">{row.completed}</td>
                <td className="px-5 py-3.5 text-foreground">{row.skipped}</td>
                <td className="px-5 py-3.5 text-foreground">{row.efficiency}</td>
                <td className="px-5 py-3.5 text-foreground">{row.revenueImpact}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PanelCard>
  )
}

function VisitHistoryCard({
  rows,
  onViewAll,
  onBack,
}: {
  rows: readonly VisitHistoryRow[]
  onViewAll?: () => void
  onBack?: () => void
}) {
  return (
    <PanelCard interactive={false} className="overflow-hidden p-0">
      <div className="flex items-center justify-between gap-3 px-5 py-4">
        <h2 className="text-base font-semibold text-foreground">
          {reportsContent.sections.visitHistory}
        </h2>
        {onViewAll ? <ViewAllButton onClick={onViewAll} /> : null}
        {onBack ? <OverviewButton onClick={onBack} /> : null}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr className="border-y border-border text-xs font-medium text-muted">
              <th className="px-5 py-3 font-medium">Date</th>
              <th className="px-5 py-3 font-medium">Property</th>
              <th className="px-5 py-3 font-medium">Round</th>
              <th className="px-5 py-3 font-medium">Technician</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className={cn('border-b border-border last:border-b-0', dashboardRowHoverClass)}>
                <td className="px-5 py-3.5 text-foreground">{row.date}</td>
                <td className="px-5 py-3.5 text-foreground">{row.property}</td>
                <td className="px-5 py-3.5 text-foreground">{row.round}</td>
                <td className="px-5 py-3.5 text-foreground">{row.technician}</td>
                <td className="px-5 py-3.5">
                  <VisitStatusBadge status={row.status} />
                </td>
                <td className="px-5 py-3.5 text-foreground">{row.amount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PanelCard>
  )
}

function SystemActivityLogCard({
  items,
  onViewAll,
  onBack,
}: {
  items: readonly ActivityLogItem[]
  onViewAll?: () => void
  onBack?: () => void
}) {
  return (
    <PanelCard interactive={false} className="p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-foreground">
          {reportsContent.sections.activityLog}
        </h2>
        {onViewAll ? <ViewAllButton onClick={onViewAll} /> : null}
        {onBack ? <OverviewButton onClick={onBack} /> : null}
      </div>

      <ul className="space-y-3">
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              className={cn(
                'flex w-full items-center gap-3 rounded-xl border border-border bg-background px-3.5 py-3 text-left',
                dashboardPressableClass,
                'hover:border-primary/20 hover:bg-surface/80',
              )}
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface text-foreground">
                <DashboardIcon name={item.icon} className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-foreground">{item.title}</span>
                <span className="mt-0.5 block text-xs text-muted">{item.meta}</span>
              </span>
              <DashboardIcon name="chevron" className="h-4 w-4 shrink-0 text-muted" />
            </button>
          </li>
        ))}
      </ul>
    </PanelCard>
  )
}

function VisitStatusBadge({ status }: { status: VisitStatus }) {
  return (
    <span
      className={cn(
        'inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold',
        VISIT_STATUS_CLASS[status],
      )}
    >
      {reportsContent.visitStatusLabels[status]}
    </span>
  )
}

function ViewAllButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={cn(dashboardCtaClass, 'px-3 py-2 text-xs')}>
      {reportsContent.viewAllLabel}
    </button>
  )
}

function OverviewButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground',
        dashboardPressableClass,
        'hover:border-primary/30 hover:text-primary',
      )}
    >
      <DashboardIcon name="arrow-left" className="h-3.5 w-3.5" />
      Overview
    </button>
  )
}

function formatRevenue(value: number) {
  return `£${Math.round(value / 1000)}K`
}

function buildSmoothPath(points: Array<{ x: number; y: number }>) {
  if (points.length === 0) return ''
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`

  let path = `M ${points[0].x} ${points[0].y}`

  for (let i = 0; i < points.length - 1; i += 1) {
    const previous = points[Math.max(0, i - 1)]
    const current = points[i]
    const next = points[i + 1]
    const afterNext = points[Math.min(points.length - 1, i + 2)]
    const tension = 0.16
    const control1X = current.x + (next.x - previous.x) * tension
    const control1Y = current.y + (next.y - previous.y) * tension
    const control2X = next.x - (afterNext.x - current.x) * tension
    const control2Y = next.y - (afterNext.y - current.y) * tension

    path += ` C ${control1X} ${control1Y}, ${control2X} ${control2Y}, ${next.x} ${next.y}`
  }

  return path
}
