import type { ReactNode } from 'react'
import type { AppQuickActionId } from '@/content/app-shell'
import { appShellContent } from '@/content/app-shell'
import type { AppQuickActions } from '@/hooks/use-app-quick-actions'
import { AddOneOffJobModal } from '@/components/dashboard/AddOneOffJobModal'
import { BulkMessageModal } from '@/components/dashboard/BulkMessageModal'
import { AppMobileHeader, AppMobileNav, AppSidebar } from '@/components/app/AppSidebar'
import { useAppSidebar } from '@/hooks/use-app-sidebar'
import { cn } from '@/lib/utils'

interface AppShellProps {
  children: ReactNode
  quickActions: AppQuickActions
  onSignOut?: () => void
  signingOut?: boolean
  /** Wider main column for data-dense modules (e.g. Round Planner). */
  mainMaxWidthClass?: string
}

/** App shell — fixed sidebar, scrollable main, shared quick-action modals. */
export function AppShell({
  children,
  quickActions,
  onSignOut,
  signingOut,
  mainMaxWidthClass = 'max-w-6xl',
}: AppShellProps) {
  const { sidebar } = appShellContent
  const sidebarState = useAppSidebar()

  function handleQuickAction(actionId: AppQuickActionId) {
    quickActions.handleQuickAction(actionId)
  }

  const sidebarNavProps = {
    navItems: sidebar.nav,
    quickActionsTitle: sidebar.quickActionsTitle,
    quickActions: sidebar.quickActions,
    onQuickAction: handleQuickAction,
    onSignOut,
    signingOut,
  }

  return (
    <div className="flex h-svh overflow-hidden bg-surface">
      <AppSidebar
        {...sidebarNavProps}
        collapsed={sidebarState.collapsed}
        onToggleCollapse={sidebarState.toggleCollapsed}
      />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <AppMobileHeader onOpenMenu={sidebarState.openMobile} />

        <main className="min-h-0 flex-1 overflow-y-auto">
          <div className={cn('mx-auto px-4 py-6 sm:px-6 lg:px-8', mainMaxWidthClass)}>{children}</div>
        </main>
      </div>

      <AppMobileNav
        {...sidebarNavProps}
        open={sidebarState.mobileOpen}
        onClose={sidebarState.closeMobile}
      />

      <BulkMessageModal
        open={quickActions.bulkMessageModalOpen}
        onClose={quickActions.closeBulkMessageModal}
      />

      <AddOneOffJobModal
        open={quickActions.addOneOffJobModalOpen}
        onClose={quickActions.closeAddOneOffJobModal}
      />
    </div>
  )
}
