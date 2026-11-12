import { ROUTES } from '@/config/routes'
import type { FloLink } from '@/api/flo.api'
import { buildDeepLink, readDeepLink } from '@/lib/deep-link'

/**
 * Where a `link.screen` goes. The screen is a closed enum: anything else (including a model-made URL)
 * gives `null` and no link is drawn. Only well-formed `round`, `date` and `visitId` params are kept.
 */
export function floLinkTarget(link: FloLink | undefined): string | null {
  if (!link) return null
  const params = link.params ?? {}
  const deep = readDeepLink(
    new URLSearchParams({ round: params.roundId ?? params.round ?? '', date: params.date ?? '', visitId: params.visitId ?? '' }),
  )
  switch (link.screen) {
    case 'TODAYS_WORK':
      return buildDeepLink(ROUTES.todaysWork, deep)
    case 'ROUND':
      return buildDeepLink(ROUTES.roundPlanner, deep)
    case 'CUSTOMERS':
      return ROUTES.customers
    case 'DEBT_PAYMENT':
      return ROUTES.debtPayment
    case 'REPORTS':
      return ROUTES.reportsHistory
    case 'COMPLAINTS':
      return ROUTES.complaints
    case 'TECHNICIANS':
      return ROUTES.technicians
    case 'INVOICES':
      return ROUTES.invoices
    default:
      return null
  }
}
