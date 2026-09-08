import { useState } from 'react'
import type { PlannerStop } from '@/api/rounds.api'
import { plannerDayStatusLabels, roundPlannerContent } from '@/content/round-planner'
import type { PlannerRoundCard } from '@/features/rounds/lib/planner'
import { formatLongDate, formatMinutes, ESTIMATED_MINUTES_PER_STOP } from '@/features/rounds/lib/planner'
import { useRoundOccurrenceDay } from '@/features/rounds/hooks/useRounds'
import { DashboardIcon } from '@/components/dashboard/DashboardIcon'
import { MessageCustomersModal } from '@/components/round-planner/MessageCustomersModal'
import { WeatherHoldModal } from '@/components/round-planner/WeatherHoldModal'
import { SidePanel } from '@/components/ui/side-panel'
import { Skeleton } from '@/components/ui/skeleton'
import { dashboardCtaClass } from '@/components/dashboard/dashboard-styles'
import { cn, formatCurrency } from '@/lib/utils'

interface RoundPlannerDetailPanelProps {
  card: PlannerRoundCard | null
  currency: string
  canMutate: boolean
  onClose: () => void
  onOpenList: (card: PlannerRoundCard) => void
  onOpenMap: (card: PlannerRoundCard) => void
}

/** Right-side round-day preview — opened from calendar cards; stops come from the day endpoint. */
export function RoundPlannerDetailPanel({
  card,
  currency,
  canMutate,
  onClose,
  onOpenList,
  onOpenMap,
}: RoundPlannerDetailPanelProps) {
  const { detailPanel } = roundPlannerContent
  const [messageOpen, setMessageOpen] = useState(false)
  const [weatherHoldOpen, setWeatherHoldOpen] = useState(false)
  const dayQuery = useRoundOccurrenceDay(card?.roundId ?? '', card?.date ?? '', Boolean(card))

  if (!card) return null

  const stops = dayQuery.data?.stops ?? []
  const dateLabel = formatLongDate(card.date)
  const roundSummary = { name: card.roundName, stopCount: card.stopCount, holdCount: card.holdCount }

  return (
    <>
      <SidePanel
        open
        panelKey={card.key}
        onClose={onClose}
        title={card.roundName}
        subtitle={dateLabel}
        widthClass="max-w-sm"
        bodyClassName="space-y-4"
        footer={
          <RoundDetailActions
            actions={detailPanel.actions}
            canMutate={canMutate}
            onOpenList={() => onOpenList(card)}
            onOpenMap={() => onOpenMap(card)}
            onMessage={() => setMessageOpen(true)}
            onWeatherHold={() => setWeatherHoldOpen(true)}
          />
        }
      >
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-accent-surface px-3 py-1 text-xs font-medium text-accent">
            {plannerDayStatusLabels[card.status]}
          </span>
          <span className="inline-flex items-center gap-1.5 text-sm text-muted">
            <DashboardIcon name="technicians" className="h-4 w-4" />
            {card.technicianName ?? detailPanel.technicianUnassigned}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-x-8 gap-y-4 border-t border-border pt-4">
          <MetricBlock label={detailPanel.metrics.totalStops} value={String(card.stopCount)} />
          <MetricBlock label={detailPanel.metrics.roundValue} value={formatCurrency(card.totalValue, currency)} />
          <MetricBlock
            label={detailPanel.metrics.completed}
            value={`${card.completedCount} / ${card.stopCount}`}
          />
          <MetricBlock
            label={detailPanel.metrics.estimatedTime}
            value={formatMinutes(card.stopCount * ESTIMATED_MINUTES_PER_STOP)}
          />
        </div>

        {card.holdCount > 0 ? (
          <div className="rounded-lg bg-warning-surface px-3 py-2 text-sm font-medium text-warning">
            <span className="mr-2 inline-block h-2 w-2 rounded-full bg-warning" aria-hidden="true" />
            {card.holdCount} {card.holdCount === 1 ? detailPanel.paymentHold : detailPanel.paymentHolds}
          </div>
        ) : null}

        <section className="border-t border-border pt-4">
          <h3 className="text-sm font-medium text-foreground">
            {detailPanel.propertiesTitle} ({dayQuery.data ? stops.length : card.stopCount})
          </h3>

          {dayQuery.isLoading ? (
            <div className="mt-3 space-y-2" aria-label={detailPanel.loadingStops}>
              <Skeleton className="h-14 w-full rounded-xl" />
              <Skeleton className="h-14 w-full rounded-xl" />
            </div>
          ) : stops.length === 0 ? (
            <p className="mt-3 text-sm text-muted">{detailPanel.noStops}</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {stops.map((stop, index) => (
                <StopCard key={stop.visitId} stop={stop} index={index + 1} currency={currency} />
              ))}
            </ul>
          )}
        </section>
      </SidePanel>

      <MessageCustomersModal open={messageOpen} round={roundSummary} onClose={() => setMessageOpen(false)} />

      <WeatherHoldModal
        open={weatherHoldOpen}
        round={roundSummary}
        dateLabel={dateLabel}
        onClose={() => setWeatherHoldOpen(false)}
      />
    </>
  )
}

function MetricBlock({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className="mt-1 text-xl font-bold tracking-tight text-foreground">{value}</p>
    </div>
  )
}

function stopDotClass(stop: PlannerStop): string {
  if (stop.status === 'COMPLETED') return 'bg-success'
  if (stop.paymentHold) return 'bg-warning'
  if (stop.issues.length > 0) return 'bg-danger'
  return 'bg-primary'
}

function StopCard({ stop, index, currency }: { stop: PlannerStop; index: number; currency: string }) {
  return (
    <li className="relative rounded-xl bg-surface px-3 py-2.5 pr-8 shadow-sm">
      <span
        className={cn('absolute top-3 right-3 h-2 w-2 rounded-full', stopDotClass(stop))}
        aria-hidden="true"
      />
      <p className="text-sm font-semibold text-foreground">
        {index}. {stop.addressLine}
      </p>
      <p className="mt-0.5 text-xs text-muted">{stop.customerName}</p>
      <p className="mt-1 text-sm font-medium text-foreground">{formatCurrency(stop.price, currency)}</p>
    </li>
  )
}

function RoundDetailActions({
  actions,
  canMutate,
  onOpenList,
  onOpenMap,
  onMessage,
  onWeatherHold,
}: {
  actions: typeof roundPlannerContent.detailPanel.actions
  canMutate: boolean
  onOpenList: () => void
  onOpenMap: () => void
  onMessage: () => void
  onWeatherHold: () => void
}) {
  return (
    <div className="space-y-2">
      <button type="button" onClick={onOpenMap} className={cn(dashboardCtaClass, 'w-full')}>
        <DashboardIcon name="map-pin" className="h-4 w-4" />
        {actions.openMap}
      </button>
      <button type="button" onClick={onOpenList} className={cn(dashboardCtaClass, 'w-full')}>
        <DashboardIcon name="list" className="h-4 w-4" />
        {actions.openList}
      </button>
      {canMutate ? (
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onMessage}
            className="flex items-center justify-center gap-2 rounded-xl bg-accent-surface px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent/10"
          >
            <DashboardIcon name="message" className="h-4 w-4" />
            {actions.message}
          </button>
          <button
            type="button"
            onClick={onWeatherHold}
            className="flex items-center justify-center gap-2 rounded-xl bg-accent-surface px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent/10"
          >
            <DashboardIcon name="cloud" className="h-4 w-4" />
            {actions.weatherHold}
          </button>
        </div>
      ) : null}
    </div>
  )
}
