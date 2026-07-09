import { ROUTES } from '@/config/routes'
import type { RoutePath } from '@/config/routes'

export interface AppNavItem {
  id: string
  label: string
  icon: string
  route: RoutePath
}

export type AppQuickActionId = 'add-round' | 'bulk-message' | 'add-one-off-job'

export interface AppQuickAction {
  id: AppQuickActionId
  label: string
  icon: string
}

/** Shared app chrome — sidebar nav and quick actions used across modules. */
export const appShellContent = {
  sidebar: {
    nav: [
      { id: 'dashboard', label: 'Dashboard', icon: 'home', route: ROUTES.dashboard },
      { id: 'round-planner', label: 'Round Planner', icon: 'calendar', route: ROUTES.roundPlanner },
      { id: 'todays-work', label: "Today's Work", icon: 'briefcase', route: ROUTES.todaysWork },
      { id: 'customers', label: 'Customers', icon: 'users', route: ROUTES.customers },
      { id: 'debt-payment', label: 'Debt/Payment', icon: 'card', route: ROUTES.debtPayment },
      { id: 'reports-history', label: 'Reports/History', icon: 'chart', route: ROUTES.reportsHistory },
      { id: 'complaints', label: 'Complaints', icon: 'message', route: ROUTES.complaints },
      { id: 'settings', label: 'Settings', icon: 'settings', route: ROUTES.settings },
      { id: 'technicians', label: 'Technicians', icon: 'technicians', route: ROUTES.technicians },
    ] satisfies AppNavItem[],
    quickActionsTitle: 'Quick Actions',
    quickActions: [
      { id: 'add-round', label: 'Add Round', icon: 'plus-circle' },
      { id: 'bulk-message', label: 'Bulk Message', icon: 'message' },
      { id: 'add-one-off-job', label: 'Add One-off Job', icon: 'plus' },
    ] satisfies AppQuickAction[],
    signOut: 'Sign out',
    signingOut: 'Signing out...',
    collapse: 'Collapse sidebar',
    expand: 'Expand sidebar',
    openMenu: 'Open navigation menu',
    closeMenu: 'Close navigation menu',
  },
  modulePlaceholder: {
    backLabel: 'Back to Dashboard',
  },
} as const
