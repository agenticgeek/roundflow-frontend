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
  reportsHistory: '/reports-history',
  complaints: '/complaints',
  settings: '/settings',
  /** Where the backend sends admins back after Stripe's OAuth (`?stripe=connected`). */
  settingsIntegrations: '/settings/integrations',
  technicians: '/technicians',
  technicianNew: '/technicians/new',
  technicianDetail: '/technicians/:technicianId',
  technicianEdit: '/technicians/:technicianId/edit',
  technicianConversation: '/technicians/:technicianId/conversation',
  technicianPhotos: '/technicians/:technicianId/photos/:photoJobId',
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

export function technicianConversationPath(technicianId: string) {
  return `/technicians/${technicianId}/conversation`
}

export function technicianPhotosPath(technicianId: string, photoJobId: string) {
  return `/technicians/${technicianId}/photos/${photoJobId}`
}
