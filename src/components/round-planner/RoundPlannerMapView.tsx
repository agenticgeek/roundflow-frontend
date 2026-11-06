import { useState } from 'react'
import { mapsContent } from '@/content/maps'
import { roundPlannerContent } from '@/content/round-planner'
import type { PlannerListStop } from '@/features/rounds/lib/planner'
import { useGeocodedStops } from '@/features/maps/hooks/useGeocodedStops'
import { StopsMapCanvas } from '@/components/maps/StopsMapCanvas'
import { stopStatus } from '@/features/maps/lib/markers'
import { DashboardIcon } from '@/components/dashboard/DashboardIcon'
import { PanelCard } from '@/components/dashboard/DashboardControls'
import { ComingSoonOverlay } from '@/components/ui/coming-soon'
import { Skeleton } from '@/components/ui/skeleton'
import { cn, formatCurrency } from '@/lib/utils'

interface RoundPlannerMapViewProps {
  stops: readonly PlannerListStop[]
  currency: string
}

const legendDotClass: Record<string, string> = {
  scheduled: 'bg-primary',
  completed: 'bg-success',
  'payment-hold': 'bg-warning',
  issue: 'bg-danger',
}

/**
 * Live Google Map for the day's stops, pinned from the backend's
 * `latitude`/`longitude` (stops without coordinates yet are skipped). Falls back to a setup notice when
 * `VITE_GOOGLE_MAPS_API_KEY` isn't configured.
 */
export function RoundPlannerMapView({ stops, currency }: RoundPlannerMapViewProps) {
  const { mapView } = roundPlannerContent
  const { points, failed, loading, error: geocodeError, configured } = useGeocodedStops(stops)
  const [selectedVisitId, setSelectedVisitId] = useState<string | null>(null)
  const [mapError, setMapError] = useState(false)
  const error = geocodeError ?? (mapError ? mapView.error : null)

  if (!configured) {
    return (
      <PanelCard interactive={false} className="overflow-hidden bg-card p-0">
        <ComingSoonOverlay copy={mapView.notConfigured} icon="settings" className="min-h-[24rem]">
          <StaticLayout stops={stops} currency={currency} />
        </ComingSoonOverlay>
      </PanelCard>
    )
  }

  return (
    <PanelCard interactive={false} className="overflow-hidden bg-card p-0">
      <div className="grid min-h-[24rem] lg:grid-cols-[minmax(0,1fr)_17.5rem]">
        <div className="relative min-h-[20rem] overflow-hidden bg-card">
          {loading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-surface/60">
              <Skeleton className="h-8 w-8 rounded-full" />
              <p className="text-xs text-muted">{mapView.loading}</p>
            </div>
          ) : error ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center">
              <DashboardIcon name="alert-circle" className="h-6 w-6 text-danger" />
              <p className="text-sm text-danger">{error}</p>
            </div>
          ) : (
            <div role="region" aria-label={mapsContent.region} className="absolute inset-0">
              <StopsMapCanvas
                points={points}
                selectedVisitId={selectedVisitId}
                onSelect={setSelectedVisitId}
                onError={() => setMapError(true)}
                currency={currency}
              />
              <MapLegend title={mapView.legendTitle} items={mapView.legend} />
              {failed.length > 0 ? <UnresolvedBadge count={failed.length} /> : null}
              {stops.length === 0 ? (
                <p role="status" className="absolute inset-x-6 top-1/2 -translate-y-1/2 rounded-xl bg-card/95 px-4 py-3 text-center text-sm font-semibold text-foreground shadow-lg">
                  {mapsContent.noStopsMatch}
                </p>
              ) : null}
            </div>
          )}
        </div>

        <aside className="border-t border-border bg-card shadow-[-12px_0_24px_rgba(10,10,10,0.035)] lg:border-t-0 lg:border-l">
          <h2 className="px-5 py-5 text-lg font-medium tracking-tight text-foreground">
            {mapView.propertiesTitle} ({stops.length})
          </h2>
          <p className="px-5 pb-3 text-xs text-muted">{mapsContent.listNote}</p>

          {stops.length > 0 ? (
            <ul className="max-h-[28rem] divide-y divide-border overflow-y-auto">
              {stops.map((stop) => {
                const geocoded = points.some((point) => point.stop.visitId === stop.visitId)
                return (
                  <StopRow
                    key={stop.visitId}
                    stop={stop}
                    currency={currency}
                    selected={selectedVisitId === stop.visitId}
                    geocoded={geocoded}
                    onSelect={() => geocoded && setSelectedVisitId(stop.visitId)}
                  />
                )
              })}
            </ul>
          ) : (
            <p className="px-5 text-sm text-muted">{mapView.noProperties}</p>
          )}
        </aside>
      </div>
    </PanelCard>
  )
}

function MapLegend({
  title,
  items,
}: {
  title: string
  items: readonly { label: string; status: string }[]
}) {
  return (
    <div className="absolute bottom-4 left-4 rounded-xl bg-card px-3.5 py-3 shadow-lg">
      <p className="text-[11px] font-medium text-foreground">{title}</p>
      <ul className="mt-2 space-y-1">
        {items.map((item) => (
          <li key={item.status} className="flex items-center gap-2 text-[11px] text-foreground">
            <span className={cn('h-2 w-2 rounded-full', legendDotClass[item.status])} />
            {item.label}
          </li>
        ))}
      </ul>
    </div>
  )
}

function UnresolvedBadge({ count }: { count: number }) {
  const { mapView } = roundPlannerContent
  return (
    <div
      className="absolute top-4 right-4 rounded-xl bg-warning-surface px-3 py-2 text-[11px] font-medium text-warning shadow-lg"
      title={mapView.unresolvedHint}
    >
      {mapView.unresolvedTitle}: {count}
    </div>
  )
}

function StopRow({
  stop,
  currency,
  selected,
  geocoded,
  onSelect,
}: {
  stop: PlannerListStop
  currency: string
  selected: boolean
  geocoded: boolean
  onSelect: () => void
}) {
  const status = stopStatus(stop)

  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        disabled={!geocoded}
        className={cn(
          'flex w-full gap-3.5 px-5 py-4 text-left transition-colors',
          geocoded ? 'cursor-pointer hover:bg-surface' : 'cursor-default',
          selected && 'bg-accent-surface',
        )}
      >
        <span
          className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', legendDotClass[status])}
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-tight text-foreground">{stop.addressLine}</p>
          <p className="mt-1 text-xs text-muted">{stop.customerName}</p>
          <p className="mt-2 text-sm font-medium text-foreground">{formatCurrency(stop.price, currency)}</p>
          {stop.locationApproximate ? (
            <p className="mt-1 inline-block rounded bg-warning-surface px-1.5 py-0.5 text-xs font-semibold text-warning-foreground" title={mapsContent.approximateHint}>
              {mapsContent.approximateBadge}
            </p>
          ) : null}
          {geocoded ? null : <p className="mt-1 text-xs font-semibold text-muted">{mapsContent.notFoundBadge}</p>}
        </div>
      </button>
    </li>
  )
}

/** Blurred behind the "setup needed" overlay — same list, no interactive map. */
function StaticLayout({ stops, currency }: { stops: readonly PlannerListStop[]; currency: string }) {
  const { mapView } = roundPlannerContent
  return (
    <div className="grid min-h-[24rem] lg:grid-cols-[minmax(0,1fr)_17.5rem]">
      <div className="relative min-h-[20rem] overflow-hidden bg-card">
        <MapLegend title={mapView.legendTitle} items={mapView.legend} />
      </div>
      <aside className="border-t border-border bg-card lg:border-t-0 lg:border-l">
        <h2 className="px-5 py-5 text-lg font-medium tracking-tight text-foreground">
          {mapView.propertiesTitle} ({stops.length})
        </h2>
        {stops.length > 0 ? (
          <ul className="divide-y divide-border">
            {stops.slice(0, 6).map((stop) => (
              <li key={stop.visitId} className="flex gap-3.5 px-5 py-4">
                <DashboardIcon name="map-pin" className="mt-0.5 h-5 w-5 shrink-0 text-muted" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold leading-tight text-foreground">{stop.addressLine}</p>
                  <p className="mt-1 text-xs text-muted">{stop.customerName}</p>
                  <p className="mt-2 text-sm font-medium text-foreground">
                    {formatCurrency(stop.price, currency)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-5 text-sm text-muted">{mapView.noProperties}</p>
        )}
      </aside>
    </div>
  )
}
