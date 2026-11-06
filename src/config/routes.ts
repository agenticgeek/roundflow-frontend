/**
 * The single source of truth for every path in the app.
 * No path string may appear anywhere outside this file.
 */
export const ROUTES = {
  home: '/',
  login: '/login',
  signup: '/signup',
  authCallback: '/auth/callback',
  forgotPassword: '/forgot-password',
  resetPassword: '/reset-password',
  acceptInvite: '/accept-invite',
  /** Where a technician's invite email lands: set name + password, then join the team. */
  technicianSetup: '/app-invite',
  technicianApp: '/technician-app',
  setupWizard: '/setup',
  setupLive: '/setup/live',
  dashboard: '/dashboard',
  emergencies: '/emergencies',
  roundPlanner: '/round-planner',
  roundPlannerAssign: '/round-planner/assign-technicians',
  propertyDetail: '/properties/:propertyId',
  todaysWork: '/todays-work',
  customers: '/customers',
  debtPayment: '/debt-payment',
  /** GAP-028 invoice and payment lists. */
  invoices: '/invoices',
  reportsHistory: '/reports-history',
  complaints: '/complaints',
  settings: '/settings',
  /** Where admins land after Stripe's OAuth completes (`?stripe=connected`). */
  settingsIntegrations: '/settings/integrations',
  /** Opens Settings on Failed integration messages (admins; the INTEGRATION notification links here). */
  /** Opens Settings on Email and branding. */
  settingsEmail: '/settings/email',
  settingsFailedMessages: '/settings/failed-messages',
  /** Stripe Connect redirect URI — register it in Stripe → Connect → Settings. */
  stripeCallback: '/settings/stripe/callback',
  technicians: '/technicians',
  technicianNew: '/technicians/new',
  technicianDetail: '/technicians/:technicianId',
  technicianEdit: '/technicians/:technicianId/edit',
  technicianConversation: '/technicians/:technicianId/conversation',
  technicianPhotos: '/technicians/:technicianId/photos/:visitId',
} as const

export type RouteKey = keyof typeof ROUTES
export type RoutePath = (typeof ROUTES)[RouteKey]

export function propertyDetailPath(propertyId: string) {
  return `/properties/${propertyId}`
}

export function technicianDetailPath(technicianId: string) {
  return `/technicians/${technicianId}`
}

export function technicianEditPath(technicianId: string) {
  return `/technicians/${technicianId}/edit`
}

/** `roundId` opens that round's chat first (it need not have a message yet). */
export function technicianConversationPath(technicianId: string, roundId?: string) {
  const base = `/technicians/${technicianId}/conversation`
  return roundId ? `${base}?round=${encodeURIComponent(roundId)}` : base
}

export function technicianPhotosPath(technicianId: string, visitId: string) {
  return `/technicians/${technicianId}/photos/${visitId}`
}
