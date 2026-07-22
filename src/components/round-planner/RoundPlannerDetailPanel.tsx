import { useState } from 'react'
import type { RoundPlannerProperty, RoundPlannerRound } from '@/content/round-planner'
import { roundPlannerContent } from '@/content/round-planner'
import { DashboardIcon } from '@/components/dashboard/DashboardIcon'
import { MessageCustomersModal } from '@/components/round-planner/MessageCustomersModal'
import { WeatherHoldModal } from '@/components/round-planner/WeatherHoldModal'
import { SidePanel } from '@/components/ui/side-panel'
import { dashboardCtaClass } from '@/components/dashboard/dashboard-styles'
import { cn } from '@/lib/utils'

interface RoundPlannerDetailPanelProps {
  round: RoundPlannerRound | null
  dateLabel?: string
  onClose: () => void
}

const propertyDotClass: Record<RoundPlannerProperty['status'], string> = {
  completed: 'bg-success',
  'payment-hold': 'bg-warning',
  scheduled: 'bg-primary',
}

/** Right-side round preview — opened from calendar cards. */
export function RoundPlannerDetailPanel({
  round,
  dateLabel,
  onClose,
}: RoundPlannerDetailPanelProps) {
  const { detailPanel } = roundPlannerContent
  const [messageOpen, setMessageOpen] = useState(false)
  const [weatherHoldOpen, setWeatherHoldOpen] = useState(false)

  if (!round) return null

  return (
    <>
      <SidePanel
        open
        panelKey={round.id}
        onClose={onClose}
        title={round.title}
        subtitle={dateLabel}
        widthClass="max-w-sm"
        bodyClassName="space-y-4"
        footer={
          <RoundDetailActions
            actions={detailPanel.actions}
            onMessage={() => setMessageOpen(true)}
            onWeatherHold={() => setWeatherHoldOpen(true)}
          />
        }
      >
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-accent-surface px-3 py-1 text-xs font-medium text-accent">
            {round.statusLabel}
          </span>
          <span className="inline-flex items-center gap-1.5 text-sm text-muted">
            <DashboardIcon name="technicians" className="h-4 w-4" />
            {round.technician}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-x-8 gap-y-4 border-t border-border pt-4">
          <MetricBlock label={detailPanel.metrics.totalStops} value={String(round.stops)} />
          <MetricBlock label={detailPanel.metrics.roundValue} value={round.value} />
          <MetricBlock
            label={detailPanel.metrics.completed}
            value={`${round.completedStops} / ${round.stops}`}
          />
          <MetricBlock label={detailPanel.metrics.estimatedTime} value={round.estimatedTime} />
        </div>

        {round.paymentHolds > 0 ? (
          <div className="rounded-lg bg-warning-surface px-3 py-2 text-sm font-medium text-warning">
            <span className="mr-2 inline-block h-2 w-2 rounded-full bg-warning" aria-hidden="true" />
            {round.paymentHolds} {detailPanel.paymentHold}
          </div>
        ) : null}

        <section className="border-t border-border pt-4">
          <h3 className="text-sm font-medium text-foreground">
            {detailPanel.propertiesTitle} ({round.properties.length})
          </h3>

          <ul className="mt-3 space-y-2">
            {round.properties.map((property, index) => (
              <PropertyCard key={property.id} property={property} index={index + 1} />
            ))}
          </ul>
        </section>
      </SidePanel>

      <MessageCustomersModal
        open={messageOpen}
        round={round}
        onClose={() => setMessageOpen(false)}
      />

      <WeatherHoldModal
        open={weatherHoldOpen}
        round={round}
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

function PropertyCard({ property, index }: { property: RoundPlannerProperty; index: number }) {
  return (
    <li className="relative rounded-xl bg-surface px-3 py-2.5 pr-8 shadow-sm">
      <span
        className={cn('absolute top-3 right-3 h-2 w-2 rounded-full', propertyDotClass[property.status])}
        aria-hidden="true"
      />
      <p className="text-sm font-semibold text-foreground">
        {index}. {property.address}
      </p>
      <p className="mt-0.5 text-xs text-muted">{property.customer}</p>
      <p className="mt-1 text-sm font-medium text-foreground">{property.price}</p>
    </li>
  )
}

function RoundDetailActions({
  actions,
  onMessage,
  onWeatherHold,
}: {
  actions: typeof roundPlannerContent.detailPanel.actions
  onMessage: () => void
  onWeatherHold: () => void
}) {
  return (
    <div className="space-y-2">
      <button type="button" className={cn(dashboardCtaClass, 'w-full')}>
        <DashboardIcon name="map-pin" className="h-4 w-4" />
        {actions.openMap}
      </button>
      <button type="button" className={cn(dashboardCtaClass, 'w-full')}>
        <DashboardIcon name="list" className="h-4 w-4" />
        {actions.openList}
      </button>
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
    </div>
  )
}
