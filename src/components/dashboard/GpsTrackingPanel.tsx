import { useMemo, useState } from 'react'
import { dashboardContent } from '@/content/dashboard'
import type { PlannerListStop } from '@/features/rounds/lib/planner'
import { StopsMapCanvas } from '@/components/maps/StopsMapCanvas'
import { useGeocodedStops } from '@/features/maps/hooks/useGeocodedStops'
import { DashboardIcon } from '@/components/dashboard/DashboardIcon'
import { PanelCard } from '@/components/dashboard/DashboardControls'
import { ComingSoonOverlay } from '@/components/ui/coming-soon'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

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
 * Today's scheduled stops plotted on a live Google Map from the backend's
 * `latitude`/`longitude` (same data as Round Planner's Map view). There is no
 * vehicle-tracking data, so this shows planned stops, not live positions.
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
              <StopsMapCanvas
                points={visiblePoints}
                selectedVisitId={selectedVisitId}
                onSelect={setSelectedVisitId}
                onError={() => setMapError(true)}
                currency="GBP"
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
