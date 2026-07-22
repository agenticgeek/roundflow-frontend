import type { MouseEvent } from 'react'
import { cn } from '@/lib/utils'

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

  // Keep tip fully visible near the top edge of clipped chart containers.
  const placeBelow = tooltip.y < 52

  return (
    <div
      role="tooltip"
      className={cn(
        'pointer-events-none absolute z-30 -translate-x-1/2 rounded-lg border border-border bg-foreground px-2.5 py-1.5 text-xs font-medium text-background shadow-lg',
        placeBelow ? 'translate-y-0' : '-translate-y-full',
      )}
      style={{ left: tooltip.x, top: placeBelow ? tooltip.y + 10 : tooltip.y - 6 }}
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
  options?: { preferPointerY?: boolean },
): { x: number; y: number } {
  const targetRect = event.currentTarget.getBoundingClientRect()
  const rootRect = chartRoot.getBoundingClientRect()
  const preferPointerY = options?.preferPointerY ?? targetRect.height > 48

  return {
    x: targetRect.left - rootRect.left + targetRect.width / 2,
    y: preferPointerY
      ? event.clientY - rootRect.top
      : targetRect.top - rootRect.top,
  }
}

export const emptyChartTooltip = (): ChartTooltipState => ({
  visible: false,
  label: '',
  value: '',
  x: 0,
  y: 0,
})
