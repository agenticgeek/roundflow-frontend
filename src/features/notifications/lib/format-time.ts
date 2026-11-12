import { notificationsContent } from '@/content/notifications'
import { getTenantTimeZone, isoDateInTenantZone } from '@/lib/timezone'
import { addDays } from '@/lib/round-dates'
import { fillCopy } from '@/lib/utils'

/**
 * A notification's time in the business time zone (the zone the backend uses for "today"):
 * `14:05` today, `Yesterday 14:05`, else `6 Nov, 14:05`. `now` is injectable for tests.
 */
export function formatNotificationTime(iso: string, now: Date = new Date()): string {
  const when = new Date(iso)
  const timeZone = getTenantTimeZone()
  const time = new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', minute: '2-digit', hour12: false }).format(when)
  const day = isoDateInTenantZone(when)
  const today = isoDateInTenantZone(now)
  if (day === today) return time
  if (day === addDays(today, -1)) return fillCopy(notificationsContent.time.yesterday, { time })
  const date = new Intl.DateTimeFormat('en-GB', { timeZone, day: 'numeric', month: 'short' }).format(when)
  return `${date}, ${time}`
}
