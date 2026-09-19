import type { DropdownOption } from '@/components/ui/dropdown'

/** Used when the browser can't enumerate zones (pre-2022 engines). */
const FALLBACK_ZONES = [
  'Europe/London',
  'Europe/Dublin',
  'Europe/Paris',
  'Europe/Berlin',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Phoenix',
  'America/Los_Angeles',
  'America/Anchorage',
  'Pacific/Honolulu',
  'America/Toronto',
  'America/Vancouver',
  'Australia/Sydney',
  'Pacific/Auckland',
  'Asia/Dubai',
  'Asia/Karachi',
  'Asia/Kolkata',
  'Asia/Singapore',
  'Africa/Johannesburg',
]

function allZones(): string[] {
  const intl = Intl as typeof Intl & { supportedValuesOf?: (key: 'timeZone') => string[] }
  try {
    const zones = intl.supportedValuesOf?.('timeZone')
    if (zones?.length) return zones
  } catch {
    // fall through
  }
  return FALLBACK_ZONES
}

/** Offset in minutes and a "GMT+05:30" label for `zone` right now (DST-aware). */
function zoneOffset(zone: string): { minutes: number; label: string } {
  try {
    const part = new Intl.DateTimeFormat('en-GB', { timeZone: zone, timeZoneName: 'longOffset' })
      .formatToParts(new Date())
      .find((item) => item.type === 'timeZoneName')?.value
    const match = part?.match(/GMT([+-])(\d{2}):(\d{2})/)
    if (!match) return { minutes: 0, label: 'GMT' }
    const sign = match[1] === '-' ? -1 : 1
    return {
      minutes: sign * (Number(match[2]) * 60 + Number(match[3])),
      label: `GMT${match[1]}${match[2]}:${match[3]}`,
    }
  } catch {
    return { minutes: 0, label: 'GMT' }
  }
}

let cached: DropdownOption[] | null = null

/** Every IANA timezone the browser knows, sorted by UTC offset, labelled "Europe/London (GMT)". */
export function timezoneOptions(current?: string): DropdownOption[] {
  if (!cached) {
    const zones = new Set([...allZones(), 'UTC'])
    cached = [...zones]
      .map((zone) => ({ zone, ...zoneOffset(zone) }))
      .sort((a, b) => a.minutes - b.minutes || a.zone.localeCompare(b.zone))
      .map(({ zone, label }) => ({ value: zone, label: `${zone.replace(/_/g, ' ')} (${label})` }))
  }
  if (current && !cached.some((option) => option.value === current)) {
    return [{ value: current, label: current.replace(/_/g, ' ') }, ...cached]
  }
  return cached
}
