import { useEffect, useRef, useState } from 'react'
import { roundPlannerContent } from '@/content/round-planner'
import type { PlannerListStop } from '@/features/rounds/lib/planner'
import { useGeocodedStops, type GeocodedStop } from '@/features/maps/hooks/useGeocodedStops'
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

/** Same priority order as the legend — a stop only gets one pin colour. */
function stopStatus(stop: PlannerListStop): keyof typeof legendDotClass {
  if (stop.issues.length > 0) return 'issue'
  if (stop.paymentHold) return 'payment-hold'
  if (stop.status === 'COMPLETED') return 'completed'
  return 'scheduled'
}

const MARKER_COLOR: Record<keyof typeof legendDotClass, string> = {
  scheduled: '#029bb6', // primary
  completed: '#16a34a', // success
  'payment-hold': '#d97706', // warning
  issue: '#dc2626', // danger
}

function markerIcon(color: string): google.maps.Symbol {
  return {
    path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7Z',
    fillColor: color,
    fillOpacity: 1,
    strokeColor: '#ffffff',
    strokeWeight: 1.5,
    scale: 1.4,
    anchor: new google.maps.Point(12, 22),
  }
}

/**
 * Live Google Map for the day's stops — geocoded client-side (Round Planner
 * handoff §8: no lat/lng in the schema). Falls back to a setup notice when
 * `VITE_GOOGLE_MAPS_API_KEY` isn't configured.
 */
export function RoundPlannerMapView({ stops, currency }: RoundPlannerMapViewProps) {
  const { mapView } = roundPlannerContent
  const { points, failed, loading, error, configured } = useGeocodedStops(stops)
  const [selectedVisitId, setSelectedVisitId] = useState<string | null>(null)

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
            <>
              <GoogleMapCanvas
                points={points}
                selectedVisitId={selectedVisitId}
                onSelect={setSelectedVisitId}
                currency={currency}
              />
              <MapLegend title={mapView.legendTitle} items={mapView.legend} />
              {failed.length > 0 ? <UnresolvedBadge count={failed.length} /> : null}
            </>
          )}
        </div>

        <aside className="border-t border-border bg-card shadow-[-12px_0_24px_rgba(10,10,10,0.035)] lg:border-t-0 lg:border-l">
          <h2 className="px-5 py-5 text-lg font-medium tracking-tight text-foreground">
            {mapView.propertiesTitle} ({stops.length})
          </h2>

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

function GoogleMapCanvas({
  points,
  selectedVisitId,
  onSelect,
  currency,
}: {
  points: readonly GeocodedStop[]
  selectedVisitId: string | null
  onSelect: (visitId: string) => void
  currency: string
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<google.maps.Map | null>(null)
  const markersRef = useRef<Map<string, google.maps.Marker>>(new Map())
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null)

  // Create the map once.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    mapRef.current = new google.maps.Map(containerRef.current, {
      center: { lat: 54.978, lng: -1.617 }, // UK-ish fallback until bounds fit
      zoom: 11,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
      clickableIcons: false,
    })
    infoWindowRef.current = new google.maps.InfoWindow()
  }, [])

  // Sync markers to the current point set.
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const nextIds = new Set(points.map((p) => p.stop.visitId))
    for (const [visitId, marker] of markersRef.current) {
      if (!nextIds.has(visitId)) {
        marker.setMap(null)
        markersRef.current.delete(visitId)
      }
    }

    const bounds = new google.maps.LatLngBounds()
    for (const { stop, point } of points) {
      bounds.extend(point)
      let marker = markersRef.current.get(stop.visitId)
      const status = stopStatus(stop)
      if (!marker) {
        marker = new google.maps.Marker({
          map,
          position: point,
          icon: markerIcon(MARKER_COLOR[status]),
        })
        marker.addListener('click', () => onSelect(stop.visitId))
        markersRef.current.set(stop.visitId, marker)
      } else {
        marker.setPosition(point)
        marker.setIcon(markerIcon(MARKER_COLOR[status]))
      }
    }

    if (points.length > 0) {
      if (points.length === 1) {
        map.setCenter(points[0]!.point)
        map.setZoom(15)
      } else {
        map.fitBounds(bounds, 48)
      }
    }
  }, [points, onSelect])

  // Open/close the info window for the selected stop.
  useEffect(() => {
    const map = mapRef.current
    const infoWindow = infoWindowRef.current
    if (!map || !infoWindow) return

    if (!selectedVisitId) {
      infoWindow.close()
      return
    }

    const entry = points.find((p) => p.stop.visitId === selectedVisitId)
    const marker = markersRef.current.get(selectedVisitId)
    if (!entry || !marker) return

    infoWindow.setContent(
      `<div style="font:13px system-ui;min-width:160px">
        <strong>${escapeHtml(entry.stop.addressLine)}</strong><br/>
        <span style="color:#666">${escapeHtml(entry.stop.customerName)}</span><br/>
        <span>${escapeHtml(formatCurrency(entry.stop.price, currency))}</span>
      </div>`,
    )
    infoWindow.open({ map, anchor: marker })
    map.panTo(entry.point)
  }, [selectedVisitId, points, currency])

  return <div ref={containerRef} className="absolute inset-0" />
}

function escapeHtml(value: string): string {
  const div = document.createElement('div')
  div.textContent = value
  return div.innerHTML
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
          geocoded ? 'cursor-pointer hover:bg-surface' : 'cursor-default opacity-60',
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
