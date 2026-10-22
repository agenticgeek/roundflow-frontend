/** Round day codes as returned by the API, indexed like `Date#getDay()`. */
const DAY_CODES = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'] as const

/** Today as `YYYY-MM-DD` in local time. */
export function todayIso(): string {
  return toIsoDate(new Date())
}

export function toIsoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

/** Parses `YYYY-MM-DD` as a local date (not UTC midnight). */
export function parseIsoDate(iso: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!match) return null
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
}

export function addDays(iso: string, days: number): string {
  const date = parseIsoDate(iso) ?? new Date()
  date.setDate(date.getDate() + days)
  return toIsoDate(date)
}

/** First date on or after `fromIso` that falls on the round's day (e.g. `MON`). */
export function firstRoundDate(fromIso: string, dayCode: string | null | undefined): string | null {
  const start = parseIsoDate(fromIso)
  const target = DAY_CODES.indexOf((dayCode ?? '') as (typeof DAY_CODES)[number])
  if (!start || target === -1) return null
  const offset = (target - start.getDay() + 7) % 7
  start.setDate(start.getDate() + offset)
  return toIsoDate(start)
}

/** `2026-10-19` → `Mon 19 Oct` (or `Mon 19 Oct 2026` with `withYear`). */
export function formatShortDate(iso: string, withYear = false): string {
  const date = parseIsoDate(iso)
  if (!date) return iso
  return date.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    ...(withYear ? { year: 'numeric' } : {}),
  }).replace(',', '')
}
