const timeFormatter = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' })
const dateTimeFormatter = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
})
const relative = new Intl.RelativeTimeFormat('en-GB', { numeric: 'auto' })

function parse(value: string | null | undefined): Date | null {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

/** "14:00" — customer window end; "—" when unset. */
export function formatWindowEnd(value: string | null | undefined): string {
  const date = parse(value)
  return date ? timeFormatter.format(date) : '—'
}

/** "15 Sept, 10:23" — for the detail panel. */
export function formatDateTime(value: string | null | undefined): string {
  const date = parse(value)
  return date ? dateTimeFormatter.format(date) : '—'
}

/** "12 minutes ago" / "yesterday" — for the reported column. */
export function formatRelativeTime(value: string | null | undefined, now = Date.now()): string {
  const date = parse(value)
  if (!date) return '—'
  const diffSeconds = Math.round((date.getTime() - now) / 1000)
  const abs = Math.abs(diffSeconds)
  if (abs < 60) return relative.format(diffSeconds, 'second')
  if (abs < 3600) return relative.format(Math.round(diffSeconds / 60), 'minute')
  if (abs < 86_400) return relative.format(Math.round(diffSeconds / 3600), 'hour')
  return relative.format(Math.round(diffSeconds / 86_400), 'day')
}

export function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0]!.toUpperCase())
    .join('')
    .slice(0, 2)
}
