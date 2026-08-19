import { useMemo, useRef, useState, type MouseEvent } from 'react'
import type {
  ActivityLogItem,
  ReportsMetric,
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
import { useToast } from '@/components/ui/toast'
import {
  useReportsActivity,
  useReportsRevenue,
  useReportsSummary,
  useReportsTechnicians,
  useReportsVisits,
} from '@/features/reports/hooks/useReports'
import {
  activityToItems,
  cycleLabelForPeriod,
  niceChartMax,
  revenueToPoints,
  summaryToMetrics,
  techniciansToRows,
  UI_PERIOD_TO_API,
  uiStatusToApi,
  visitsToRows,
} from '@/features/reports/lib/mappers'
import { useAppBootstrap } from '@/providers/AppBootstrapProvider'
import { ApiError } from '@/lib/errors'
import { cn } from '@/lib/utils'
import {
  ReportsActivitySkeleton,
  ReportsChartSkeleton,
  ReportsMetricsSkeleton,
  ReportsScreenSkeleton,
  ReportsTableSkeleton,
} from '@/components/reports/ReportsSkeletons'

const VISIT_STATUS_CLASS: Record<VisitStatus, string> = {
  completed: 'border-success/40 bg-success/5 text-success',
  skipped: 'border-danger/40 bg-danger/5 text-danger',
  'in-progress': 'border-success/40 bg-success/5 text-success',
  pending: 'border-border bg-surface text-muted',
  scheduled: 'border-border bg-surface text-muted',
}

type FocusedReport = 'technicians' | 'visits' | 'activity'

/** Reports & History — live `/reports/*` aggregate, charts, and logs. */
export function ReportsScreen() {
  const { canMutate } = useAppBootstrap()
  const { showToast } = useToast()
  const [period, setPeriod] = useState<ReportsPeriod>('Monthly')
  const [statusFilter, setStatusFilter] = useState('all')
  const [focusedReport, setFocusedReport] = useState<FocusedReport | null>(null)

  const apiPeriod = UI_PERIOD_TO_API[period]
  const visitStatus = uiStatusToApi(statusFilter)

  const summaryQuery = useReportsSummary({ period: apiPeriod })
  const revenueQuery = useReportsRevenue({ period: apiPeriod, granularity: 'daily' })
  const techniciansQuery = useReportsTechnicians({ period: apiPeriod })
  const visitsQuery = useReportsVisits({ period: apiPeriod, status: visitStatus })
  const activityQuery = useReportsActivity()

  const metrics = useMemo(() => summaryToMetrics(summaryQuery.data), [summaryQuery.data])
  const revenuePoints = useMemo(
    () => revenueToPoints(revenueQuery.data, apiPeriod),
    [apiPeriod, revenueQuery.data],
  )
  const technicians = useMemo(
    () => techniciansToRows(techniciansQuery.data),
    [techniciansQuery.data],
  )
  const visits = useMemo(() => visitsToRows(visitsQuery.data), [visitsQuery.data])
  const activity = useMemo(() => activityToItems(activityQuery.data), [activityQuery.data])

  if (!canMutate) {
    return (
      <PanelCard interactive={false} className="py-12 text-center text-sm text-muted">
        Reports are available to admins and managers only.
      </PanelCard>
    )
  }

  const permissionBlocked =
    summaryQuery.isError &&
    summaryQuery.error instanceof ApiError &&
    summaryQuery.error.status === 403

  if (permissionBlocked) {
    return (
      <PanelCard interactive={false} className="py-12 text-center text-sm text-muted">
        You don&apos;t have permission to view reports.
      </PanelCard>
    )
  }

  const initialLoading =
    summaryQuery.isPending &&
    revenueQuery.isPending &&
    techniciansQuery.isPending &&
    visitsQuery.isPending &&
    activityQuery.isPending

  if (initialLoading && !focusedReport) {
    return <ReportsScreenSkeleton />
  }

  if (focusedReport) {
    return (
      <div key={focusedReport} className="animate-slide-in-right space-y-5">
        <ReportsHeader
          cycleLabel={cycleLabelForPeriod(apiPeriod)}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          onExport={() => showToast('Export is not available yet.')}
        />

        {focusedReport === 'technicians' ? (
          <TechnicianPerformanceCard
            rows={technicians}
            loading={techniciansQuery.isPending}
            error={techniciansQuery.isError}
            onRetry={() => void techniciansQuery.refetch()}
            onBack={() => setFocusedReport(null)}
          />
        ) : null}

        {focusedReport === 'visits' ? (
          <VisitHistoryCard
            rows={visits}
            loading={visitsQuery.isPending}
            error={visitsQuery.isError}
            onRetry={() => void visitsQuery.refetch()}
            onBack={() => setFocusedReport(null)}
          />
        ) : null}

        {focusedReport === 'activity' ? (
          <SystemActivityLogCard
            items={activity}
            loading={activityQuery.isPending}
            error={activityQuery.isError}
            onRetry={() => void activityQuery.refetch()}
            onBack={() => setFocusedReport(null)}
          />
        ) : null}
      </div>
    )
  }

  return (
    <div className="animate-fade-in space-y-5">
      <ReportsHeader
        cycleLabel={cycleLabelForPeriod(apiPeriod)}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        onExport={() => showToast('Export is not available yet.')}
      />

      <ReportsMetricGrid metrics={metrics} loading={summaryQuery.isPending} />

      <RevenueOverviewCard
        period={period}
        onPeriodChange={setPeriod}
        data={revenuePoints}
        loading={revenueQuery.isPending}
        error={revenueQuery.isError}
        onRetry={() => void revenueQuery.refetch()}
      />

      <TechnicianPerformanceCard
        rows={technicians.slice(0, 2)}
        loading={techniciansQuery.isPending}
        error={techniciansQuery.isError}
        onRetry={() => void techniciansQuery.refetch()}
        onViewAll={() => setFocusedReport('technicians')}
      />

      <VisitHistoryCard
        rows={visits.slice(0, 3)}
        loading={visitsQuery.isPending}
        error={visitsQuery.isError}
        onRetry={() => void visitsQuery.refetch()}
        onViewAll={() => setFocusedReport('visits')}
      />

      <SystemActivityLogCard
        items={activity.slice(0, 4)}
        loading={activityQuery.isPending}
        error={activityQuery.isError}
        onRetry={() => void activityQuery.refetch()}
        onViewAll={() => setFocusedReport('activity')}
      />
    </div>
  )
}

function ReportsHeader({
  cycleLabel,
  statusFilter,
  onStatusFilterChange,
  onExport,
}: {
  cycleLabel: string
  statusFilter: string
  onStatusFilterChange: (value: string) => void
  onExport: () => void
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
          <span>{cycleLabel}</span>
        </div>

        <Select
          inputSize="sm"
          value={statusFilter}
          onChange={(event) => onStatusFilterChange(event.target.value)}
          options={[...reportsContent.statusFilter.options]}
          aria-label={reportsContent.statusFilter.label}
          className="min-w-[7.5rem] rounded-lg border-border bg-accent-surface/60"
        />

        <button type="button" className={dashboardCtaClass} onClick={onExport}>
          <DashboardIcon name="upload" className="h-4 w-4" />
          {reportsContent.exportLabel}
        </button>
      </div>
    </header>
  )
}

function ReportsMetricGrid({
  metrics,
  loading,
}: {
  metrics: ReportsMetric[]
  loading?: boolean
}) {
  if (loading) return <ReportsMetricsSkeleton />

  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => (
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
        </article>
      ))}
    </section>
  )
}

function RevenueOverviewCard({
  period,
  onPeriodChange,
  data,
  loading,
  error,
  onRetry,
}: {
  period: ReportsPeriod
  onPeriodChange: (period: ReportsPeriod) => void
  data: readonly RevenuePoint[]
  loading?: boolean
  error?: boolean
  onRetry?: () => void
}) {
  if (loading) return <ReportsChartSkeleton />

  return (
    <PanelCard interactive={false} className="p-5">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">
            {reportsContent.sections.revenueOverview}
          </h2>
          <p className="mt-1 text-xs text-muted">{reportsContent.periodHints[period]}</p>
        </div>
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
      {error ? (
        <EmptyState message="Could not load revenue." onRetry={onRetry} />
      ) : data.length === 0 ? (
        <EmptyState message="No revenue in this period." />
      ) : (
        <RevenueLineChart data={data} />
      )}
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
  const maxValue = niceChartMax(data.map((item) => item.value))
  const tickCount = 4
  const yTicks = Array.from({ length: tickCount }, (_, index) =>
    Math.round((maxValue / tickCount) * (index + 1)),
  )
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
      value: formatTooltipMoney(value),
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
        aria-label="Revenue trend"
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
                {formatAxisTick(tick)}
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
          const hitWidth =
            index === 0
              ? nextX - point.x
              : index === points.length - 1
                ? point.x - previousX
                : (nextX - previousX) / 2

          return (
            <rect
              key={`${point.label}-${index}`}
              x={point.x - hitWidth / 2}
              y={padTop}
              width={Math.max(hitWidth, 8)}
              height={chartBottom - padTop}
              fill="transparent"
              className="cursor-crosshair"
              onMouseEnter={(event) => showTooltip(event, point.label, point.value)}
              onMouseMove={(event) => showTooltip(event, point.label, point.value)}
              onMouseLeave={() => setTooltip(emptyChartTooltip())}
            />
          )
        })}

        {points.map((point, index) => (
          <text
            key={`label-${point.label}-${index}`}
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
  loading,
  error,
  onRetry,
  onViewAll,
  onBack,
}: {
  rows: readonly TechnicianPerformanceRow[]
  loading?: boolean
  error?: boolean
  onRetry?: () => void
  onViewAll?: () => void
  onBack?: () => void
}) {
  if (loading) {
    return <ReportsTableSkeleton titleClassName="w-48" rows={onViewAll ? 2 : 5} />
  }

  return (
    <PanelCard interactive={false} className="overflow-hidden p-0">
      <div className="flex items-center justify-between gap-3 px-5 py-4">
        <h2 className="text-base font-semibold text-foreground">
          {reportsContent.sections.technicianPerformance}
        </h2>
        {onViewAll ? <ViewAllButton onClick={onViewAll} /> : null}
        {onBack ? <OverviewButton onClick={onBack} /> : null}
      </div>

      {error ? (
        <div className="px-5 pb-5">
          <EmptyState message="Could not load technician performance." onRetry={onRetry} />
        </div>
      ) : rows.length === 0 ? (
        <p className="px-5 py-10 text-sm text-muted">No technician performance in this period.</p>
      ) : (
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
                <tr
                  key={row.id}
                  className={cn('border-b border-border last:border-b-0', dashboardRowHoverClass)}
                >
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
      )}
    </PanelCard>
  )
}

function VisitHistoryCard({
  rows,
  loading,
  error,
  onRetry,
  onViewAll,
  onBack,
}: {
  rows: readonly VisitHistoryRow[]
  loading?: boolean
  error?: boolean
  onRetry?: () => void
  onViewAll?: () => void
  onBack?: () => void
}) {
  if (loading) {
    return <ReportsTableSkeleton titleClassName="w-36" rows={onViewAll ? 3 : 6} cols={6} />
  }

  return (
    <PanelCard interactive={false} className="overflow-hidden p-0">
      <div className="flex items-center justify-between gap-3 px-5 py-4">
        <h2 className="text-base font-semibold text-foreground">
          {reportsContent.sections.visitHistory}
        </h2>
        {onViewAll ? <ViewAllButton onClick={onViewAll} /> : null}
        {onBack ? <OverviewButton onClick={onBack} /> : null}
      </div>

      {error ? (
        <div className="px-5 pb-5">
          <EmptyState message="Could not load visit history." onRetry={onRetry} />
        </div>
      ) : rows.length === 0 ? (
        <p className="px-5 py-10 text-sm text-muted">No visits in this period.</p>
      ) : (
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
                <tr
                  key={row.id}
                  className={cn('border-b border-border last:border-b-0', dashboardRowHoverClass)}
                >
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
      )}
    </PanelCard>
  )
}

function SystemActivityLogCard({
  items,
  loading,
  error,
  onRetry,
  onViewAll,
  onBack,
}: {
  items: readonly ActivityLogItem[]
  loading?: boolean
  error?: boolean
  onRetry?: () => void
  onViewAll?: () => void
  onBack?: () => void
}) {
  if (loading) {
    return <ReportsActivitySkeleton rows={onViewAll ? 4 : 6} />
  }

  return (
    <PanelCard interactive={false} className="p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-foreground">
          {reportsContent.sections.activityLog}
        </h2>
        {onViewAll ? <ViewAllButton onClick={onViewAll} /> : null}
        {onBack ? <OverviewButton onClick={onBack} /> : null}
      </div>

      {error ? (
        <EmptyState message="Could not load activity log." onRetry={onRetry} />
      ) : items.length === 0 ? (
        <p className="py-8 text-sm text-muted">No activity yet.</p>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.id}>
              <div className="flex w-full items-center gap-3 rounded-xl border border-border bg-background px-3.5 py-3 text-left">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface text-foreground">
                  <DashboardIcon name={item.icon} className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-foreground">{item.title}</span>
                  <span className="mt-0.5 block text-xs text-muted">{item.meta}</span>
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
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

function EmptyState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="py-10 text-center text-sm text-muted">
      <p>{message}</p>
      {onRetry ? (
        <button type="button" className={cn(dashboardCtaClass, 'mt-3')} onClick={onRetry}>
          Retry
        </button>
      ) : null}
    </div>
  )
}

function formatTooltipMoney(value: number) {
  return `£${value.toLocaleString('en-GB', {
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`
}

function formatAxisTick(value: number) {
  if (value >= 1000) return `${Math.round(value / 1000)}K`
  return String(Math.round(value))
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
