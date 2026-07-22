import type { TechnicianLocation } from '@/content/dashboard'
import { DashboardIcon } from '@/components/dashboard/DashboardIcon'
import {
  dashboardHoverCardClass,
  dashboardPressableClass,
  toneBgClass,
  toneTextClass,
} from '@/components/dashboard/dashboard-styles'
import { cn } from '@/lib/utils'

interface GpsTrackingPanelProps {
  title: string
  statusLabel: string
  mapTitle: string
  mapSubtitle: string
  mapCaption: string
  techniciansTitle: string
  technicians: readonly TechnicianLocation[]
  selectedTechnician: string | null
  onSelectTechnician: (name: string) => void
}

/** Map pin — highlights when its technician card is selected. */
function TechnicianPin({
  technician,
  selected,
  onSelect,
}: {
  technician: TechnicianLocation
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      aria-label={`View ${technician.name} on map`}
      onClick={onSelect}
      className="absolute -translate-x-1/2 -translate-y-1/2 text-center transition-transform duration-150 hover:scale-110"
      style={{ left: `${technician.position.x}%`, top: `${technician.position.y}%` }}
    >
      <span
        className={cn(
          'mx-auto flex h-9 w-9 items-center justify-center rounded-full border-4 border-background shadow-lg transition-all duration-150',
          toneBgClass(technician.tone),
          toneTextClass(technician.tone),
          selected && 'ring-2 ring-primary ring-offset-2',
        )}
      >
        <DashboardIcon name="gps" className="h-5 w-5" />
      </span>
      <span className="mt-1 inline-flex rounded bg-background px-2 py-0.5 text-[11px] font-medium text-foreground shadow-sm">
        {technician.name}
      </span>
    </button>
  )
}

function MapPlaceholder({
  technicians,
  title,
  subtitle,
  caption,
  selectedTechnician,
  onSelectTechnician,
}: {
  technicians: readonly TechnicianLocation[]
  title: string
  subtitle: string
  caption: string
  selectedTechnician: string | null
  onSelectTechnician: (name: string) => void
}) {
  return (
    <div className="relative min-h-[320px] overflow-hidden rounded-xl bg-surface">
      <svg viewBox="0 0 900 420" className="absolute inset-0 h-full w-full text-muted/30" aria-hidden="true">
        <path
          fill="currentColor"
          d="M109 105c58-40 127-39 169-8 35 26 69 23 112 10 59-18 120-17 173 9 60 31 121 19 186 0 37-11 75-5 102 13v209H75V145c9-12 20-26 34-40Z"
        />
        <path
          fill="currentColor"
          d="M44 219c51-19 96-10 127 17 35 31 81 23 116-4 55-42 121-45 172-9 34 24 75 31 118 17 67-22 128-6 184 33v95H44V219Z"
          opacity="0.6"
        />
        <path
          fill="currentColor"
          d="M666 110c37-26 83-24 122-5 27 13 54 13 84 7v174c-53 10-93 1-122-27-34-33-67-37-117-18-50 19-99 9-128-26 54-7 94-30 161-105Z"
          opacity="0.75"
        />
      </svg>

      {technicians.map((technician) => (
        <TechnicianPin
          key={technician.name}
          technician={technician}
          selected={selectedTechnician === technician.name}
          onSelect={() => onSelectTechnician(technician.name)}
        />
      ))}

      <div className="absolute inset-x-0 bottom-16 text-center">
        <DashboardIcon name="gps" className="mx-auto h-12 w-12 text-muted" />
        <p className="mt-3 text-base font-semibold text-foreground">{title}</p>
        <p className="mt-1 text-sm text-muted">{subtitle}</p>
        <p className="mt-2 text-xs text-muted">{caption}</p>
      </div>
    </div>
  )
}

/** Live GPS panel — pin + card selection stay in sync. */
export function GpsTrackingPanel({
  title,
  statusLabel,
  mapTitle,
  mapSubtitle,
  mapCaption,
  techniciansTitle,
  technicians,
  selectedTechnician,
  onSelectTechnician,
}: GpsTrackingPanelProps) {
  return (
    <section className="rounded-xl border border-border bg-background shadow-sm">
      <div className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-5">
        <div className="flex items-center gap-2">
          <DashboardIcon name="gps" className="h-5 w-5 text-primary" />
          <h2 className="text-base font-medium text-foreground">{title}</h2>
        </div>
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" />
          {statusLabel}
        </span>
      </div>

      <div className="grid gap-5 p-4 sm:p-5 xl:grid-cols-[1fr_280px]">
        <MapPlaceholder
          technicians={technicians}
          title={mapTitle}
          subtitle={mapSubtitle}
          caption={mapCaption}
          selectedTechnician={selectedTechnician}
          onSelectTechnician={onSelectTechnician}
        />

        <div>
          <p className="text-sm font-semibold text-foreground">{techniciansTitle}</p>
          <div className="mt-5 space-y-4">
            {technicians.map((technician) => {
              const selected = selectedTechnician === technician.name

              return (
                <button
                  key={technician.name}
                  type="button"
                  onClick={() => onSelectTechnician(technician.name)}
                  className={cn(
                    'w-full rounded-xl border bg-background p-4 text-left shadow-sm',
                    dashboardHoverCardClass,
                    dashboardPressableClass,
                    selected ? 'border-primary/30 ring-1 ring-primary/20' : 'border-border',
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className={cn('h-2.5 w-2.5 rounded-full', toneBgClass(technician.tone))} />
                      <p className="text-sm font-semibold text-foreground">{technician.name}</p>
                    </div>
                    <p className="text-xs text-muted">{technician.lastSeen}</p>
                  </div>
                  <p className="mt-3 text-xs text-muted">Status: {technician.status}</p>
                  {technician.current ? (
                    <p className="mt-1 text-xs text-muted">Current: {technician.current}</p>
                  ) : null}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
