/**
 * The business time zone (Settings → Business Profile, default Europe/London). The backend decides
 * "today" in this zone, so the web uses it for "today" too instead of the browser's.
 */
export const DEFAULT_TIME_ZONE = 'Europe/London'

let tenantTimeZone = DEFAULT_TIME_ZONE

function isValidTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat('en-GB', { timeZone: value })
    return true
  } catch {
    return false
  }
}

/** Called once the business profile has loaded; an unknown or empty zone falls back to London. */
export function setTenantTimeZone(value: string | null | undefined) {
  tenantTimeZone = value && isValidTimeZone(value) ? value : DEFAULT_TIME_ZONE
}

export function getTenantTimeZone(): string {
  return tenantTimeZone
}

/** The calendar day of `date` in the business time zone, as `YYYY-MM-DD`. */
export function isoDateInTenantZone(date: Date = new Date()): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tenantTimeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}
