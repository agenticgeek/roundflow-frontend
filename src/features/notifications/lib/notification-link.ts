import type { NotificationData, NotificationType } from '@/api/notifications.api'
import { propertyDetailPath, ROUTES } from '@/config/routes'
import { buildDeepLink } from '@/lib/deep-link'

/** Where to go for a type with no ids in `data` (or none we have a page for). */
const TYPE_FALLBACK: Partial<Record<NotificationType, string>> = {
  COMPLAINT: ROUTES.complaints,
  KPI_ALERT: ROUTES.dashboard,
  INVITE: ROUTES.technicians,
  DAY_CLOSED: ROUTES.todaysWork,
  PAYMENT: ROUTES.invoices,
  INTEGRATION: ROUTES.settingsFailedMessages,
}

/**
 * The in-app page a notification opens, or `null` when it has none (it is then only marked read).
 * Schedule and round updates open the Round Planner on that round, day and visit; an access issue and
 * a closed day open Today's Work on that visit or day (an access issue needs the round to find the visit; without it the property page opens). Otherwise `data` decides first — invoice →
 * Invoices, property → its detail page, visit → Today's Work, round → Round Planner, customer →
 * Customers — then the type's own page.
 */
export function notificationHref(type: NotificationType, data: NotificationData | null): string | null {
  const link = { visitId: data?.visitId, round: data?.roundId, date: data?.date }
  if ((type === 'SCHEDULE' || type === 'ROUND_UPDATE') && data?.roundId) return buildDeepLink(ROUTES.roundPlanner, link)
  if (type === 'ACCESS_ISSUE' && data?.visitId && data.roundId) return buildDeepLink(ROUTES.todaysWork, link)
  if (type === 'DAY_CLOSED') return buildDeepLink(ROUTES.todaysWork, { date: data?.date })
  if (data?.invoiceId) return ROUTES.invoices
  if (data?.propertyId) return propertyDetailPath(data.propertyId)
  if (data?.visitId) return buildDeepLink(ROUTES.todaysWork, link)
  if (data?.roundId) return buildDeepLink(ROUTES.roundPlanner, link)
  if (data?.customerId) return ROUTES.customers
  return TYPE_FALLBACK[type] ?? null
}
