/**
 * The single source of truth for every path in the app.
 * No path string may appear anywhere outside this file.
 */
export const ROUTES = {
  home: '/',
  login: '/login',
  signup: '/signup',
  forgotPassword: '/forgot-password',
  resetPassword: '/reset-password',
  setupWizard: '/setup',
  dashboard: '/dashboard',
  roundPlanner: '/round-planner',
  propertyDetail: '/properties/:propertyId',
  todaysWork: '/todays-work',
  customers: '/customers',
  debtPayment: '/debt-payment',
  reportsHistory: '/reports-history',
  complaints: '/complaints',
  settings: '/settings',
  technicians: '/technicians',
} as const

export type RouteKey = keyof typeof ROUTES
export type RoutePath = (typeof ROUTES)[RouteKey]

export function propertyDetailPath(propertyId: string) {
  return `/properties/${propertyId}`
}
