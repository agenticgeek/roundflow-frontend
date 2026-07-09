import type { RoundPlannerProperty, RoundPlannerRound } from '@/content/round-planner'
import { roundPlannerContent } from '@/content/round-planner'
import { DashboardIcon } from '@/components/dashboard/DashboardIcon'
import { PanelCard } from '@/components/dashboard/DashboardControls'
import { cn } from '@/lib/utils'

interface RoundPlannerMapViewProps {
  round: RoundPlannerRound | null
}

const propertyStatusClass: Record<RoundPlannerProperty['status'], string> = {
  scheduled: 'bg-primary/10 text-primary',
  completed: 'bg-success/10 text-success',
  'payment-hold': 'bg-warning-surface text-warning',
}

const legendDotClass: Record<string, string> = {
  scheduled: 'bg-primary',
  completed: 'bg-success',
  'payment-hold': 'bg-warning',
  issue: 'bg-danger',
}

/** Map tab layout — visual map canvas plus properties sidebar. */
export function RoundPlannerMapView({ round }: RoundPlannerMapViewProps) {
  const { mapView } = roundPlannerContent

  return (
    <PanelCard interactive={false} className="overflow-hidden bg-card p-0">
      <div className="grid min-h-[24rem] lg:grid-cols-[minmax(0,1fr)_17.5rem]">
        <div className="relative min-h-[20rem] overflow-hidden bg-card">
          <WorldMapIllustration />
          <MapControls controls={mapView.controls} />
          <MapLegend title={mapView.legendTitle} items={mapView.legend} />
        </div>

        <aside className="border-t border-border bg-card shadow-[-12px_0_24px_rgba(10,10,10,0.035)] lg:border-t-0 lg:border-l">
          <h2 className="px-5 py-5 text-lg font-medium tracking-tight text-foreground">
            {mapView.propertiesTitle} ({round?.properties.length ?? 0})
          </h2>

          {round ? (
            <ul className="divide-y divide-border">
              {round.properties.map((property) => (
                <PropertyMapRow key={property.id} property={property} />
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-muted">{mapView.noProperties}</p>
          )}
        </aside>
      </div>
    </PanelCard>
  )
}

function MapControls({ controls }: { controls: typeof roundPlannerContent.mapView.controls }) {
  return (
    <div className="absolute top-5 left-4 overflow-hidden rounded-xl bg-card shadow-lg">
      <button type="button" aria-label={controls.zoomIn} className="block px-3.5 py-2.5 text-xs font-semibold hover:bg-surface">
        +
      </button>
      <button type="button" aria-label={controls.zoomOut} className="block border-t border-border px-3.5 py-2.5 text-xs font-semibold hover:bg-surface">
        -
      </button>
      <button type="button" aria-label={controls.expand} className="block border-t border-border px-3.5 py-2.5 text-xs font-semibold hover:bg-surface">
        ↗
      </button>
    </div>
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

function PropertyMapRow({ property }: { property: RoundPlannerProperty }) {
  const { statusLabels } = roundPlannerContent.mapView

  return (
    <li className="flex gap-3.5 px-5 py-4">
      <DashboardIcon name="map-pin" className="mt-0.5 h-5 w-5 shrink-0 text-muted" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold leading-tight text-foreground">{property.address}</p>
        <p className="mt-1 text-xs text-muted">{property.customer}</p>
        <div className="mt-2 flex items-center gap-2.5">
          <span
            className={cn(
              'rounded-full px-2.5 py-1 text-xs font-medium leading-none',
              propertyStatusClass[property.status],
            )}
          >
            {statusLabels[property.status]}
          </span>
          <span className="text-sm font-medium text-foreground">{property.price}</span>
        </div>
      </div>
    </li>
  )
}

function WorldMapIllustration() {
  return (
    <svg
      viewBox="0 0 900 520"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 h-full w-full text-muted/30"
      aria-hidden="true"
    >
      <rect width="900" height="520" fill="currentColor" className="text-card" />
      <g fill="currentColor">
        <path d="M41 78c31-31 92-24 119-8 17 10 51 7 75 8 41 3 79 24 93 54 20 42-39 55-56 84-23 40 16 84-12 123-18 25-59 10-81-10-26-24-54-51-87-47-31 4-45-18-40-45 7-39 45-50 42-81-3-32-78-32-70-62 2-7 9-12 17-16Z" />
        <path d="M269 65c39-16 98-30 139-11 24 11 72 16 74 45 3 34-54 32-70 55-17 24 18 52 4 80-16 32-62 25-91 12-36-16-68-44-107-39-32 4-51-26-32-51 18-25 62-25 78-50 8-12-17-25 5-41Z" />
        <path d="M413 177c36-22 104-6 129 24 25 29-16 68-7 108 8 36 65 62 45 96-18 31-76 19-105-11-36-37-33-76-60-112-27-35-43-80-2-105Z" />
        <path d="M565 94c62-35 163-51 233-14 45 23 71 75 44 112-24 33-89 25-122 48-36 26-23 82-63 106-38 22-91 4-112-34-18-32 22-61 17-93-6-37-60-82 3-125Z" />
        <path d="M692 342c43-17 113-13 135 21 28 43-18 90-67 86-33-2-49-31-77-45-36-18-27-48 9-62Z" />
      </g>
    </svg>
  )
}
