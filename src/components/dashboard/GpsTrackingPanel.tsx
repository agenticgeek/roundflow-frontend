import { useEffect, useMemo, useRef, useState } from 'react'
import { dashboardContent } from '@/content/dashboard'
import type { PlannerListStop } from '@/features/rounds/lib/planner'
import { useGeocodedStops, type GeocodedStop } from '@/features/maps/hooks/useGeocodedStops'
import { DashboardIcon } from '@/components/dashboard/DashboardIcon'
import { PanelCard } from '@/components/dashboard/DashboardControls'
import { ComingSoonOverlay } from '@/components/ui/coming-soon'
import { Skeleton } from '@/components/ui/skeleton'
import { cn, formatCurrency } from '@/lib/utils'

interface GpsTrackingPanelProps {
  stops: readonly PlannerListStop[]
  loading: boolean
  selectedTechnician: string | null
  onSelectTechnician: (name: string | null) => void
}

const legendDotClass: Record<string, string> = {
  scheduled: 'bg-primary',
  completed: 'bg-success',
  'payment-hold': 'bg-warning',
  issue: 'bg-danger',
}

/** Same priority order as Round Planner's map — a stop only gets one pin colour. */
function stopStatus(stop: PlannerListStop): keyof typeof legendDotClass {
  if (stop.issues.length > 0) return 'issue'
  if (stop.paymentHold) return 'payment-hold'
  if (stop.status === 'COMPLETED') return 'completed'
  return 'scheduled'
}

const MARKER_COLOR: Record<keyof typeof legendDotClass, string> = {
  scheduled: '#029bb6',
  completed: '#16a34a',
  'payment-hold': '#d97706',
  issue: '#dc2626',
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

interface TechnicianSummary {
  name: string
  total: number
  completed: number
  issues: number
  paymentHolds: number
}

function summarizeByTechnician(stops: readonly PlannerListStop[]): TechnicianSummary[] {
  const byName = new Map<string, TechnicianSummary>()
  for (const stop of stops) {
    const name = stop.technicianName ?? dashboardContent.gps.unassigned
    const entry = byName.get(name) ?? { name, total: 0, completed: 0, issues: 0, paymentHolds: 0 }
    entry.total += 1
    if (stop.status === 'COMPLETED') entry.completed += 1
    if (stop.issues.length > 0) entry.issues += 1
    if (stop.paymentHold) entry.paymentHolds += 1
    byName.set(name, entry)
  }
  return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name))
}

/**
 * Today's scheduled stops plotted on a live Google Map, geocoded client-side
 * (same infra as Round Planner's Map view — no lat/lng or vehicle-tracking
 * data exists in the schema, so this shows planned stops, not live positions).
 */
export function GpsTrackingPanel({ stops, loading, selectedTechnician, onSelectTechnician }: GpsTrackingPanelProps) {
  const { gps } = dashboardContent
  const { points, failed, loading: geocoding, error: geocodeError, configured } = useGeocodedStops(stops)
  const [selectedVisitId, setSelectedVisitId] = useState<string | null>(null)
  const [mapError, setMapError] = useState(false)
  const error = geocodeError ?? (mapError ? gps.error : null)

  const technicians = useMemo(() => summarizeByTechnician(stops), [stops])

  const visiblePoints = selectedTechnician
    ? points.filter((point) => (point.stop.technicianName ?? gps.unassigned) === selectedTechnician)
    : points

  const completed = stops.filter((stop) => stop.status === 'COMPLETED').length

  const header = (
    <div className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-5">
      <div className="flex items-center gap-2">
        <DashboardIcon name="gps" className="h-5 w-5 text-primary" />
        <div>
          <h2 className="text-base font-medium text-foreground">{gps.title}</h2>
          <p className="text-xs text-muted">{gps.subtitle}</p>
        </div>
      </div>
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground">
        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
        {loading ? '…' : `${completed}/${stops.length} completed`}
      </span>
    </div>
  )

  if (!configured) {
    return (
      <PanelCard interactive={false} className="overflow-hidden bg-card p-0">
        {header}
        <ComingSoonOverlay copy={gps.notConfigured} icon="settings" className="min-h-[22rem]">
          <StaticTechnicianList technicians={technicians} title={gps.techniciansTitle} noStops={gps.noStops} />
        </ComingSoonOverlay>
      </PanelCard>
    )
  }

  return (
    <PanelCard interactive={false} className="overflow-hidden bg-card p-0">
      {header}
      <div className="grid min-h-[22rem] lg:grid-cols-[minmax(0,1fr)_17.5rem]">
        <div className="relative min-h-[18rem] overflow-hidden bg-card">
          {loading || geocoding ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-surface/60">
              <Skeleton className="h-8 w-8 rounded-full" />
              <p className="text-xs text-muted">{gps.loading}</p>
            </div>
          ) : error ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center">
              <DashboardIcon name="alert-circle" className="h-6 w-6 text-danger" />
              <p className="text-sm text-danger">{error}</p>
            </div>
          ) : points.length === 0 ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center">
              <DashboardIcon name="map-pin" className="h-6 w-6 text-muted" />
              <p className="text-sm text-muted">{gps.noStops}</p>
            </div>
          ) : (
            <>
              <GoogleMapCanvas
                points={visiblePoints}
                selectedVisitId={selectedVisitId}
                onSelect={setSelectedVisitId}
                onError={() => setMapError(true)}
              />
              <MapLegend items={gps.legend} />
              {failed.length > 0 ? <UnresolvedBadge count={failed.length} /> : null}
            </>
          )}
        </div>

        <aside className="border-t border-border bg-card shadow-[-12px_0_24px_rgba(10,10,10,0.035)] lg:border-t-0 lg:border-l">
          <h2 className="px-5 py-5 text-sm font-semibold text-foreground">{gps.techniciansTitle}</h2>
          {technicians.length > 0 ? (
            <ul className="max-h-[22rem] divide-y divide-border overflow-y-auto">
              {technicians.map((technician) => (
                <li key={technician.name}>
                  <button
                    type="button"
                    onClick={() =>
                      onSelectTechnician(selectedTechnician === technician.name ? null : technician.name)
                    }
                    className={cn(
                      'flex w-full flex-col gap-1 px-5 py-3.5 text-left transition-colors hover:bg-surface',
                      selectedTechnician === technician.name && 'bg-accent-surface',
                    )}
                  >
                    <span className="text-sm font-semibold text-foreground">{technician.name}</span>
                    <span className="text-xs text-muted">
                      {technician.completed}/{technician.total} stops complete
                    </span>
                    {technician.issues > 0 || technician.paymentHolds > 0 ? (
                      <span className="flex gap-2 text-[11px]">
                        {technician.issues > 0 ? (
                          <span className="text-danger">{technician.issues} issue{technician.issues === 1 ? '' : 's'}</span>
                        ) : null}
                        {technician.paymentHolds > 0 ? (
                          <span className="text-warning">{technician.paymentHolds} hold{technician.paymentHolds === 1 ? '' : 's'}</span>
                        ) : null}
                      </span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 text-sm text-muted">{gps.noStops}</p>
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
  onError,
}: {
  points: readonly GeocodedStop[]
  selectedVisitId: string | null
  onSelect: (visitId: string) => void
  onError: () => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<google.maps.Map | null>(null)
  const markersRef = useRef<Map<string, google.maps.Marker>>(new Map())
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null)

  // Google's JS API can leave `google.maps` in a broken state (stub
  // constructors that throw) when auth/referrer checks fail, so this is
  // wrapped rather than letting it crash the whole app.
  useEffect(() => {
    if (!containerRef.current || mapRef.current || typeof google === 'undefined') return
    try {
      mapRef.current = new google.maps.Map(containerRef.current, {
        center: { lat: 54.978, lng: -1.617 },
        zoom: 11,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
        clickableIcons: false,
      })
      infoWindowRef.current = new google.maps.InfoWindow()
    } catch {
      onError()
    }
  }, [onError])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    try {
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
          marker = new google.maps.Marker({ map, position: point, icon: markerIcon(MARKER_COLOR[status]) })
          marker.addListener('click', () => onSelect(stop.visitId))
          markersRef.current.set(stop.visitId, marker)
        } else {
          marker.setMap(map)
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
    } catch {
      onError()
    }
  }, [points, onSelect, onError])

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
        <span>${escapeHtml(formatCurrency(entry.stop.price, 'GBP'))}</span>
      </div>`,
    )
    infoWindow.open({ map, anchor: marker })
    map.panTo(entry.point)
  }, [selectedVisitId, points])

  return <div ref={containerRef} className="absolute inset-0" />
}

function escapeHtml(value: string): string {
  const div = document.createElement('div')
  div.textContent = value
  return div.innerHTML
}

function MapLegend({ items }: { items: readonly { label: string; status: string }[] }) {
  return (
    <div className="absolute bottom-4 left-4 rounded-xl bg-card px-3.5 py-3 shadow-lg">
      <ul className="space-y-1">
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
  const { gps } = dashboardContent
  return (
    <div
      className="absolute top-4 right-4 rounded-xl bg-warning-surface px-3 py-2 text-[11px] font-medium text-warning shadow-lg"
      title={gps.unresolvedHint}
    >
      {gps.unresolvedTitle}: {count}
    </div>
  )
}

/** Blurred behind the "setup needed" overlay — same technician list, no interactive map. */
function StaticTechnicianList({
  technicians,
  title,
  noStops,
}: {
  technicians: readonly TechnicianSummary[]
  title: string
  noStops: string
}) {
  return (
    <div className="grid min-h-[22rem] lg:grid-cols-[minmax(0,1fr)_17.5rem]">
      <div className="relative min-h-[18rem] overflow-hidden bg-card" />
      <aside className="border-t border-border bg-card lg:border-t-0 lg:border-l">
        <h2 className="px-5 py-5 text-sm font-semibold text-foreground">{title}</h2>
        {technicians.length > 0 ? (
          <ul className="divide-y divide-border">
            {technicians.map((technician) => (
              <li key={technician.name} className="px-5 py-3.5">
                <p className="text-sm font-semibold text-foreground">{technician.name}</p>
                <p className="text-xs text-muted">
                  {technician.completed}/{technician.total} stops complete
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-5 text-sm text-muted">{noStops}</p>
        )}
      </aside>
    </div>
  )
}
