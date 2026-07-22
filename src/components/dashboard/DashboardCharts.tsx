import { useRef, useState, type MouseEvent } from 'react'
import type { ChartBar, IssueBar } from '@/content/dashboard'
import {
  ChartTooltip,
  emptyChartTooltip,
  getChartTooltipPosition,
  type ChartTooltipState,
} from '@/components/dashboard/ChartTooltip'
import { dashboardChartBarHoverClass } from '@/components/dashboard/dashboard-styles'
import { cn } from '@/lib/utils'

/** Shared hover tooltip wiring for all dashboard charts. */
function useChartHover() {
  const rootRef = useRef<HTMLDivElement>(null)
  const [tooltip, setTooltip] = useState<ChartTooltipState>(emptyChartTooltip())

  function showTooltip(event: MouseEvent<Element>, label: string, value: string) {
    if (!rootRef.current) return
    const { x, y } = getChartTooltipPosition(event, rootRef.current)
    setTooltip({ visible: true, label, value, x, y })
  }

  function hideTooltip() {
    setTooltip(emptyChartTooltip())
  }

  return { rootRef, tooltip, showTooltip, hideTooltip }
}

/** Bar chart with hover tooltips — reusable for value KPI charts. */
export function DashboardBarChart({
  data,
  valueFormatter = (value) => String(value),
}: {
  data: readonly ChartBar[]
  valueFormatter?: (value: number) => string
}) {
  const { rootRef, tooltip, showTooltip, hideTooltip } = useChartHover()

  return (
    <div ref={rootRef} data-chart-root className="relative h-44 overflow-visible">
      <ChartTooltip tooltip={tooltip} />
      <div className="flex h-36 items-end gap-6 overflow-visible border-l border-border/60 border-b border-border/60 px-4">
        {data.map((item) => (
          <div key={item.label} className="flex h-full flex-1 items-end">
            <button
              type="button"
              aria-label={`${item.label}: ${valueFormatter(item.value)}`}
              className={cn('w-full rounded-t bg-primary', dashboardChartBarHoverClass)}
              style={{ height: `${item.value}%` }}
              onMouseEnter={(event) => showTooltip(event, item.label, valueFormatter(item.value))}
              onMouseMove={(event) => showTooltip(event, item.label, valueFormatter(item.value))}
              onMouseLeave={hideTooltip}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-6 gap-6 px-4 text-center text-xs text-muted">
        {data.map((item) => (
          <span key={item.label}>{item.label}</span>
        ))}
      </div>
    </div>
  )
}

/** Line chart with hover tooltips on each data point. */
export function DashboardLineChart({
  data,
  valueFormatter = (value) => String(value),
}: {
  data: readonly ChartBar[]
  valueFormatter?: (value: number) => string
}) {
  const { rootRef, tooltip, showTooltip, hideTooltip } = useChartHover()
  const width = 600
  const height = 130
  const points = data
    .map((item, index) => {
      const x = (index / Math.max(data.length - 1, 1)) * width
      const y = height - (item.value / 100) * height
      return `${x},${y}`
    })
    .join(' ')

  return (
    <div ref={rootRef} data-chart-root className="relative h-44 overflow-visible pt-2">
      <ChartTooltip tooltip={tooltip} />
      <svg viewBox={`0 0 ${width} ${height}`} className="h-36 w-full overflow-visible">
        <polyline fill="none" stroke="currentColor" strokeWidth="3" points={points} className="text-success" />
        {data.map((item, index) => {
          const x = (index / Math.max(data.length - 1, 1)) * width
          const y = height - (item.value / 100) * height
          return (
            <circle
              key={item.label}
              cx={x}
              cy={y}
              r="6"
              className={cn('cursor-pointer fill-success transition-all duration-150 hover:fill-success/80')}
              onMouseEnter={(event) => showTooltip(event, item.label, valueFormatter(item.value))}
              onMouseMove={(event) => showTooltip(event, item.label, valueFormatter(item.value))}
              onMouseLeave={hideTooltip}
            />
          )
        })}
      </svg>
      <div className="grid grid-cols-6 text-center text-xs text-muted">
        {data.map((item) => (
          <span key={item.label}>{item.label}</span>
        ))}
      </div>
    </div>
  )
}

/** Grouped bar chart for complaints / strikes / upsells with tooltips. */
export function DashboardIssueChart({ data }: { data: readonly IssueBar[] }) {
  const { rootRef, tooltip, showTooltip, hideTooltip } = useChartHover()

  const series = [
    { key: 'complaints' as const, label: 'Complaints', className: 'bg-danger' },
    { key: 'strikes' as const, label: 'Strikes', className: 'bg-warning' },
    { key: 'upsells' as const, label: 'Upsells', className: 'bg-success' },
  ]

  return (
    <div ref={rootRef} data-chart-root className="relative h-44 overflow-visible">
      <ChartTooltip tooltip={tooltip} />
      <div className="flex h-36 items-end gap-6 overflow-visible border-l border-border/60 border-b border-border/60 px-4">
        {data.map((item) => (
          <div key={item.label} className="flex h-full flex-1 items-end justify-center gap-1.5">
            {series.map((bar) => (
              <button
                key={bar.key}
                type="button"
                aria-label={`${item.label} ${bar.label}: ${item[bar.key]}`}
                className={cn('rounded-t', bar.className, dashboardChartBarHoverClass, bar.key === 'upsells' ? 'w-5' : 'w-3')}
                style={{ height: `${item[bar.key] * 10}%` }}
                onMouseEnter={(event) =>
                  showTooltip(event, `${item.label} · ${bar.label}`, String(item[bar.key]))
                }
                onMouseMove={(event) =>
                  showTooltip(event, `${item.label} · ${bar.label}`, String(item[bar.key]))
                }
                onMouseLeave={hideTooltip}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-6 gap-6 px-4 text-center text-xs text-muted">
        {data.map((item) => (
          <span key={item.label}>{item.label}</span>
        ))}
      </div>
    </div>
  )
}
