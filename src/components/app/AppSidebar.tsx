import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { NavLink } from 'react-router-dom'
import type { AppNavItem, AppQuickAction, AppQuickActionId } from '@/content/app-shell'
import { appShellContent } from '@/content/app-shell'
import { Brand } from '@/components/layout/Brand'
import { DashboardIcon } from '@/components/dashboard/DashboardIcon'
import {
  dashboardNavItemClass,
  dashboardOutlineButtonClass,
  dashboardQuickActionClass,
} from '@/components/dashboard/dashboard-styles'
import { cn } from '@/lib/utils'

interface AppSidebarNavProps {
  navItems: readonly AppNavItem[]
  quickActionsTitle: string
  quickActions: readonly AppQuickAction[]
  collapsed?: boolean
  onQuickAction?: (actionId: AppQuickActionId) => void
  onSignOut?: () => void
  signingOut?: boolean
  onNavigate?: () => void
  showCollapseToggle?: boolean
  onToggleCollapse?: () => void
}

/** Shared sidebar navigation content — desktop and mobile drawer. */
export function AppSidebarNav({
  navItems,
  quickActionsTitle,
  quickActions,
  collapsed = false,
  onQuickAction,
  onSignOut,
  signingOut = false,
  onNavigate,
  showCollapseToggle = false,
  onToggleCollapse,
}: AppSidebarNavProps) {
  const { signOut, signingOut: signingOutLabel, collapse, expand } = appShellContent.sidebar

  return (
    <>
      <div
        className={cn(
          'flex shrink-0 border-b border-border',
          collapsed
            ? 'flex-col items-center gap-2 px-2 py-4'
            : 'items-center justify-between gap-2 px-4 py-5',
        )}
      >
        <div className={cn('min-w-0', collapsed && 'w-10 overflow-hidden')}>
          <Brand asLink={false} className={collapsed ? 'h-10 w-auto max-w-none' : 'h-10'} />
        </div>

        {showCollapseToggle && onToggleCollapse ? (
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={collapsed ? expand : collapse}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface hover:text-foreground"
          >
            <DashboardIcon
              name={collapsed ? 'chevron-right' : 'chevron-left'}
              className="h-4 w-4"
            />
          </button>
        ) : null}
      </div>

      <nav className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-3 py-2" aria-label="Main">
        {navItems.map((item) => (
          <NavLink
            key={item.id}
            to={item.route}
            title={collapsed ? item.label : undefined}
            onClick={onNavigate}
            className={({ isActive }) => dashboardNavItemClass(isActive, collapsed)}
          >
            <DashboardIcon name={item.icon} className="h-4 w-4 shrink-0" />
            <span className={cn('truncate', collapsed && 'sr-only')}>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="shrink-0 border-t border-border p-3">
        <p className={cn('px-1 text-xs font-medium text-foreground', collapsed && 'sr-only')}>
          {quickActionsTitle}
        </p>
        <div className={cn('space-y-1.5', !collapsed && 'mt-2')}>
          {quickActions.map((action) => (
            <button
              key={action.id}
              type="button"
              title={collapsed ? action.label : undefined}
              onClick={() => onQuickAction?.(action.id)}
              className={dashboardQuickActionClass(collapsed)}
            >
              <DashboardIcon name={action.icon} className="h-3.5 w-3.5 shrink-0" />
              <span className={cn('truncate', collapsed && 'sr-only')}>{action.label}</span>
            </button>
          ))}
          {onSignOut ? (
            <button
              type="button"
              title={collapsed ? signOut : undefined}
              onClick={onSignOut}
              disabled={signingOut}
              className={cn(dashboardOutlineButtonClass(collapsed), signingOut && 'opacity-60')}
            >
              <DashboardIcon name="log-out" className={cn('shrink-0', collapsed ? 'h-4 w-4' : 'hidden')} />
              <span className={cn(!collapsed && 'flex-1', collapsed && 'sr-only')}>
                {signingOut ? signingOutLabel : signOut}
              </span>
            </button>
          ) : null}
        </div>
      </div>
    </>
  )
}

interface AppSidebarProps extends AppSidebarNavProps {
  collapsed: boolean
  onToggleCollapse: () => void
}

/** Desktop sidebar — collapses to icon rail on large screens. */
export function AppSidebar({
  collapsed,
  onToggleCollapse,
  ...navProps
}: AppSidebarProps) {
  return (
    <aside
      className={cn(
        'hidden h-svh shrink-0 flex-col overflow-hidden border-r border-border bg-background transition-[width] duration-300 ease-out lg:flex',
        collapsed ? 'w-[4.5rem]' : 'w-52',
      )}
    >
      <AppSidebarNav
        {...navProps}
        collapsed={collapsed}
        showCollapseToggle
        onToggleCollapse={onToggleCollapse}
      />
    </aside>
  )
}

interface AppMobileNavProps extends AppSidebarNavProps {
  open: boolean
  onClose: () => void
}

/** Mobile navigation drawer — full sidebar on small screens. */
export function AppMobileNav({ open, onClose, ...navProps }: AppMobileNavProps) {
  const { closeMenu } = appShellContent.sidebar

  useEffect(() => {
    if (!open) return

    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-50 lg:hidden">
      <button
        type="button"
        aria-label={closeMenu}
        onClick={onClose}
        className="absolute inset-0 bg-foreground/25 backdrop-blur-[1px]"
      />

      <aside className="absolute inset-y-0 left-0 flex w-[min(18rem,88vw)] flex-col border-r border-border bg-background shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          aria-label={closeMenu}
          className="absolute top-4 right-4 z-10 flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface hover:text-foreground"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5" aria-hidden="true">
            <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 1 0-1.06-1.06L10 8.94 6.28 5.22Z" />
          </svg>
        </button>

        <AppSidebarNav {...navProps} onNavigate={onClose} />
      </aside>
    </div>,
    document.body,
  )
}

interface AppMobileHeaderProps {
  onOpenMenu: () => void
}

/** Mobile top bar — menu toggle when the sidebar is hidden. */
export function AppMobileHeader({ onOpenMenu }: AppMobileHeaderProps) {
  const { openMenu } = appShellContent.sidebar

  return (
    <header className="flex shrink-0 items-center justify-between border-b border-border bg-background px-4 py-3 lg:hidden">
      <Brand asLink={false} className="h-10" />
      <button
        type="button"
        onClick={onOpenMenu}
        aria-label={openMenu}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-surface"
      >
        <DashboardIcon name="list" className="h-5 w-5" />
      </button>
    </header>
  )
}
