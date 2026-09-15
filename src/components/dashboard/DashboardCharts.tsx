import { useRef, useState, type MouseEvent } from 'react'
import type { ChartBar } from '@/content/dashboard'
import {
  ChartTooltip,
  emptyChartTooltip,
  getChartTooltipPosition,
  type ChartTooltipState,
} from '@/components/dashboard/ChartTooltip'
import { dashboardChartBarHoverClass } from '@/components/dashboard/dashboard-styles'
import { ComingSoonOverlay, type ComingSoonCopy } from '@/components/ui/coming-soon'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

/** Static bar texture blurred behind the "no data" message — same shape as the loading skeleton. */
function PlaceholderBars({ labels }: { labels: readonly string[] }) {
  const count = labels.length > 0 ? labels.length : 6
  const columns = { gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` }
  const placeholderLabels = labels.length > 0 ? labels : Array.from({ length: count }, () => '—')

  return (
    <div>
      <div
        className="grid h-36 items-end gap-3 border-l border-border/60 border-b border-border/60 px-4"
        style={columns}
      >
        {Array.from({ length: count }, (_, index) => (
          <div key={index} className="flex h-full items-end">
            <div className="w-full rounded-t bg-muted/40" style={{ height: `${30 + ((index * 23) % 55)}%` }} />
          </div>
        ))}
      </div>
      <div className="mt-2 grid gap-3 px-4 text-center text-xs text-muted" style={columns}>
        {placeholderLabels.map((label, index) => (
          <span key={`${label}-${index}`}>{label}</span>
        ))}
      </div>
    </div>
  )
}

/** Shared hover tooltip wiring for dashboard charts. */
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

interface DashboardBarChartProps {
  /** Raw values — bars are scaled against the largest value. */
  data: readonly ChartBar[]
  valueFormatter?: (value: number) => string
  barClassName?: string
  loading?: boolean
  /** Shown blurred behind a message when there's no real data — an empty array, or every value is 0. */
  emptyCopy: ComingSoonCopy
}

/** Bar chart with hover tooltips, scaled to the series maximum. */
export function DashboardBarChart({
  data,
  valueFormatter = (value) => String(value),
  barClassName = 'bg-primary',
  loading = false,
  emptyCopy,
}: DashboardBarChartProps) {
  const { rootRef, tooltip, showTooltip, hideTooltip } = useChartHover()
  const max = Math.max(0, ...data.map((item) => item.value))
  const columns = { gridTemplateColumns: `repeat(${Math.max(data.length, 1)}, minmax(0, 1fr))` }
  // An API response of `[]`, or a series that's real but entirely zero, both read as "nothing to show yet".
  const hasData = data.length > 0 && max > 0

  if (loading) {
    return (
      <div className="flex h-44 items-end gap-3 px-4 pb-8">
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} className="flex-1" style={{ height: `${30 + ((index * 23) % 55)}%` }} />
        ))}
      </div>
    )
  }

  if (!hasData) {
    return (
      <ComingSoonOverlay copy={emptyCopy} icon="chart" className="h-44">
        <PlaceholderBars labels={data.map((item) => item.label)} />
      </ComingSoonOverlay>
    )
  }

  return (
    <div ref={rootRef} data-chart-root className="relative h-44 overflow-visible">
      <ChartTooltip tooltip={tooltip} />
      <div
        className="grid h-36 items-end gap-3 overflow-visible border-l border-border/60 border-b border-border/60 px-4"
        style={columns}
      >
        {data.map((item) => {
          const height = max === 0 ? 0 : Math.max(2, Math.round((item.value / max) * 100))
          return (
            <div key={item.label} className="flex h-full items-end">
              <button
                type="button"
                aria-label={`${item.label}: ${valueFormatter(item.value)}`}
                className={cn('w-full rounded-t', barClassName, dashboardChartBarHoverClass)}
                style={{ height: `${height}%` }}
                onMouseEnter={(event) => showTooltip(event, item.label, valueFormatter(item.value))}
                onMouseMove={(event) => showTooltip(event, item.label, valueFormatter(item.value))}
                onMouseLeave={hideTooltip}
              />
            </div>
          )
        })}
      </div>
      <div className="mt-2 grid gap-3 px-4 text-center text-xs text-muted" style={columns}>
        {data.map((item) => (
          <span key={item.label}>{item.label}</span>
        ))}
      </div>
    </div>
  )
}
