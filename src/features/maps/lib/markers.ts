import { mapsContent } from '@/content/maps'
import { formatShortDate } from '@/lib/round-dates'
import type { PlannerListStop } from '@/features/rounds/lib/planner'

/** Highest zoom `fitBounds` may leave the map at, so one address never zooms to rooftops (WEB-10). */
export const MAX_FIT_ZOOM = 17

/** The Cloud map ID Advanced Markers need; `DEMO_MAP_ID` is Google's documented development ID. */
export const DEFAULT_MAP_ID = 'DEMO_MAP_ID'

export function mapId(env: Record<string, unknown> = import.meta.env): string {
  const configured = env.VITE_GOOGLE_MAPS_MAP_ID
  return (typeof configured === 'string' && configured.trim()) || DEFAULT_MAP_ID
}

export type StopStatus = 'scheduled' | 'completed' | 'payment-hold' | 'issue'

/** One pin colour per stop; the same priority order as the legend. */
export function stopStatus(stop: PlannerListStop): StopStatus {
  if (stop.issues.length > 0) return 'issue'
  if (stop.paymentHold) return 'payment-hold'
  if (stop.status === 'COMPLETED') return 'completed'
  return 'scheduled'
}

const STATUS_PRIORITY: StopStatus[] = ['issue', 'payment-hold', 'scheduled', 'completed']

export const STATUS_COLOR: Record<StopStatus, string> = {
  scheduled: '#029bb6',
  completed: '#16a34a',
  'payment-hold': '#d97706',
  issue: '#dc2626',
}

/** A shape/letter on the pin so the status is not carried by colour alone (WEB-19). */
export const STATUS_GLYPH: Record<StopStatus, string> = {
  scheduled: '',
  completed: '✓',
  'payment-hold': '£',
  issue: '!',
}

export type MapPoint = { stop: PlannerListStop; point: { lat: number; lng: number } }

export type MapGroup = {
  key: string
  point: { lat: number; lng: number }
  stops: PlannerListStop[]
  /** The most urgent status among the stops. */
  status: StopStatus
  approximate: boolean
}

/**
 * Stops whose coordinates agree to 4 decimals (about 11 m) share one pin: a postcode centre puts every
 * property of the postcode on exactly the same point. The pin shows a count and opens a list.
 */
export function groupPoints(points: readonly MapPoint[]): MapGroup[] {
  const groups = new Map<string, MapGroup>()
  for (const { stop, point } of points) {
    const key = `${point.lat.toFixed(4)},${point.lng.toFixed(4)}`
    const existing = groups.get(key)
    if (existing) existing.stops.push(stop)
    else groups.set(key, { key, point, stops: [stop], status: 'scheduled', approximate: false })
  }
  for (const group of groups.values()) {
    const statuses = group.stops.map(stopStatus)
    group.status = STATUS_PRIORITY.find((status) => statuses.includes(status)) as StopStatus
    group.approximate = group.stops.some((stop) => stop.locationApproximate === true)
  }
  return [...groups.values()]
}

export function pinTitle(group: MapGroup): string {
  const first = group.stops[0]
  return group.stops.length > 1
    ? mapsContent.pinTitleGroup.replace('{count}', String(group.stops.length)).replace('{address}', first.addressLine)
    : mapsContent.pinTitleSingle.replace('{address}', first.addressLine).replace('{status}', mapsContent.statusLabels[group.status])
}

export function pinLabel(group: MapGroup): string {
  return group.stops.length > 1 ? String(group.stops.length) : STATUS_GLYPH[group.status]
}

/** Escapes text for use inside info-window HTML. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Info-window HTML for a pin: address, customer, round, technician, visit date, status text and an
 * "Approximate location" note. Every dynamic value is escaped. `navigateUrl` is escaped too.
 */
export function infoWindowHtml(group: MapGroup, formatPrice: (value: number) => string, navigateUrl: (stop: PlannerListStop) => string): string {
  const copy = mapsContent.info
  const stops = group.stops
    .map((stop) => {
      const lines = [
        `<strong>${escapeHtml(stop.addressLine)}</strong>`,
        `<span style="color:#555">${escapeHtml(stop.customerName)} · ${escapeHtml(formatPrice(stop.price))}</span>`,
        `<span>${copy.round}: ${escapeHtml(stop.roundName)}</span>`,
        `<span>${copy.technician}: ${escapeHtml(stop.technicianName || copy.unassigned)}</span>`,
        ...(stop.date ? [`<span>${copy.visit}: ${escapeHtml(formatShortDate(stop.date))}</span>`] : []),
        `<span>${copy.status}: ${escapeHtml(mapsContent.statusLabels[stopStatus(stop)])}</span>`,
        `<a href="${escapeHtml(navigateUrl(stop))}" target="_blank" rel="noopener noreferrer" style="color:#027a91;font-weight:600">${escapeHtml(copy.navigate)}</a>`,
      ]
      return `<div style="display:flex;flex-direction:column;gap:2px;margin-top:6px">${lines.join('')}</div>`
    })
    .join('<hr style="margin:8px 0;border:0;border-top:1px solid #ddd"/>')
  const heading = group.stops.length > 1 ? `<strong>${escapeHtml(copy.stopsHere.replace('{count}', String(group.stops.length)))}</strong>` : ''
  const approximate = group.approximate
    ? `<div style="margin-top:6px;padding:2px 6px;background:#fef3c7;color:#78350f;font-weight:600;border-radius:4px">${escapeHtml(mapsContent.approximateBadge)}</div>`
    : ''
  return `<div style="font:13px system-ui;min-width:180px;max-width:260px">${heading}${stops}${approximate}</div>`
}
