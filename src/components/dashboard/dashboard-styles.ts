import type { DashboardTone } from '@/content/dashboard'
import { cn } from '@/lib/utils'

/** Semantic text color for dashboard status tones. */
export function toneTextClass(tone: DashboardTone = 'default') {
  const classes: Record<DashboardTone, string> = {
    default: 'text-muted',
    primary: 'text-primary',
    success: 'text-success',
    warning: 'text-warning',
    danger: 'text-danger',
  }

  return classes[tone]
}

/** Semantic background fill for dashboard status tones. */
export function toneBgClass(tone: DashboardTone = 'default') {
  const classes: Record<DashboardTone, string> = {
    default: 'bg-surface',
    primary: 'bg-primary/10',
    success: 'bg-success/10',
    warning: 'bg-warning-surface',
    danger: 'bg-danger/10',
  }

  return classes[tone]
}

/** Semantic border color for dashboard status tones. */
export function toneBorderClass(tone: DashboardTone = 'default') {
  const classes: Record<DashboardTone, string> = {
    default: 'border-border',
    primary: 'border-primary/20',
    success: 'border-success/20',
    warning: 'border-warning-border',
    danger: 'border-danger/20',
  }

  return classes[tone]
}

/** Reusable hover lift for cards and panels — import instead of duplicating classes. */
export const dashboardHoverCardClass =
  'transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-md'

/** Reusable press feedback for buttons. */
export const dashboardPressableClass = 'transition-all duration-200 active:scale-[0.98]'

/** Reusable row hover for tables and list items. */
export const dashboardRowHoverClass = 'transition-colors duration-150 hover:bg-surface/80'

/** Sidebar nav item classes — active tab uses accent surface + accent text. */
export function dashboardNavItemClass(active: boolean, collapsed = false) {
  return cn(
    'flex w-full items-center rounded-lg py-2 text-left text-[13px] font-medium transition-colors duration-150',
    collapsed ? 'justify-center px-2' : 'gap-2.5 px-3',
    active
      ? 'bg-accent-surface text-accent'
      : 'text-foreground hover:bg-accent-surface/70 hover:text-accent',
  )
}

/** Selected state for filter chips and segmented toggles. */
export const dashboardSelectedChipClass = 'border-accent/30 bg-accent-surface text-accent'

export const dashboardSelectedSegmentClass = 'bg-accent-surface text-accent'

/** Teal drop shadow for primary CTAs on app module screens. */
export const dashboardCtaShadowClass =
  'shadow-[0_4px_14px_rgba(2,155,182,0.32)] hover:shadow-[0_6px_18px_rgba(2,155,182,0.38)]'

/** Solid primary CTA — use on dashboard, Today's Work, Round Planner, etc. */
export const dashboardCtaClass = cn(
  'inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold leading-none text-primary-foreground',
  'transition-all duration-200 hover:opacity-90',
  dashboardCtaShadowClass,
  dashboardPressableClass,
)

/** Primary CTA toggle — same solid style; ring indicates active/pressed state. */
export function dashboardCtaToggleClass(active: boolean) {
  return cn(
    dashboardCtaClass,
    active && 'ring-2 ring-primary-foreground/30 ring-offset-1 ring-offset-primary',
  )
}

/** Primary quick-action button in the sidebar. */
export function dashboardQuickActionClass(collapsed = false) {
  return cn(
    'flex w-full items-center rounded-lg bg-primary text-left text-[11px] font-semibold text-primary-foreground',
    collapsed ? 'justify-center px-2 py-2' : 'gap-2 px-3 py-2',
    'transition-all duration-200 hover:opacity-90',
    dashboardCtaShadowClass,
    dashboardPressableClass,
  )
}

/** Secondary outline button used in the sidebar. */
export function dashboardOutlineButtonClass(collapsed = false) {
  return cn(
    'flex w-full items-center rounded-lg border border-border bg-background text-left text-[11px] font-semibold text-foreground',
    collapsed ? 'justify-center px-2 py-2' : 'gap-2 px-3 py-2',
    'transition-colors duration-150 hover:bg-surface disabled:cursor-not-allowed disabled:opacity-60',
  )
}

/** Chart bar/column hover — brighten on pointer over. */
export const dashboardChartBarHoverClass =
  'cursor-pointer transition-all duration-150 hover:opacity-80 hover:brightness-110'
