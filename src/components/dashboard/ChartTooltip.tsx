import type { MouseEvent } from 'react'

/** Floating tooltip rendered inside a relatively positioned chart container. */
export interface ChartTooltipState {
  visible: boolean
  label: string
  value: string
  x: number
  y: number
}

interface ChartTooltipProps {
  tooltip: ChartTooltipState
}

export function ChartTooltip({ tooltip }: ChartTooltipProps) {
  if (!tooltip.visible) return null

  return (
    <div
      role="tooltip"
      className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-full rounded-lg border border-border bg-foreground px-2.5 py-1.5 text-xs font-medium text-background shadow-lg"
      style={{ left: tooltip.x, top: tooltip.y - 6 }}
    >
      <p className="text-[10px] text-background/70">{tooltip.label}</p>
      <p className="font-semibold">{tooltip.value}</p>
    </div>
  )
}

/** Compute tooltip position relative to a chart root element. */
export function getChartTooltipPosition(
  event: MouseEvent<Element>,
  chartRoot: HTMLElement,
): { x: number; y: number } {
  const targetRect = event.currentTarget.getBoundingClientRect()
  const rootRect = chartRoot.getBoundingClientRect()

  return {
    x: targetRect.left - rootRect.left + targetRect.width / 2,
    y: targetRect.top - rootRect.top,
  }
}

export const emptyChartTooltip = (): ChartTooltipState => ({
  visible: false,
  label: '',
  value: '',
  x: 0,
  y: 0,
})
