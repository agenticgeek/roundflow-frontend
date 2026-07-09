import type { ReactNode } from 'react'
import { DashboardIcon } from '@/components/dashboard/DashboardIcon'
import {
  dashboardHoverCardClass,
  dashboardPressableClass,
  dashboardSelectedChipClass,
  dashboardSelectedSegmentClass,
} from '@/components/dashboard/dashboard-styles'
import { cn } from '@/lib/utils'

/** Selectable filter chip — used for technician filters. */
export function FilterChip({
  label,
  active,
  dotClass,
  onClick,
}: {
  label: string
  active: boolean
  dotClass: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-xs font-semibold shadow-sm transition-all duration-150',
        dashboardPressableClass,
        active
          ? dashboardSelectedChipClass
          : 'border-border bg-background text-muted hover:border-accent/20 hover:text-accent',
      )}
    >
      <span className={cn('h-2 w-2 rounded-full', dotClass)} />
      {label}
    </button>
  )
}

/** Segmented toggle — Monthly / Yearly period switcher. */
export function SegmentToggle({
  options,
  value,
  onChange,
}: {
  options: readonly string[]
  value: string
  onChange: (next: string) => void
}) {
  return (
    <div className="rounded-lg bg-background p-1 shadow-sm">
      {options.map((option) => {
        const active = value === option
        return (
          <button
            key={option}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option)}
            className={cn(
              'rounded-md px-3 py-1.5 text-xs font-semibold transition-colors duration-150',
              dashboardPressableClass,
              active ? dashboardSelectedSegmentClass : 'text-muted hover:text-accent',
            )}
          >
            {option}
          </button>
        )
      })}
    </div>
  )
}

/** Icon-only action button — refresh, chevrons, etc. */
export function IconButton({
  icon,
  label,
  onClick,
  spinning = false,
  className,
}: {
  icon: string
  label: string
  onClick?: () => void
  spinning?: boolean
  className?: string
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        'rounded-lg p-1.5 text-muted transition-colors duration-150 hover:bg-surface hover:text-foreground',
        dashboardPressableClass,
        className,
      )}
    >
      <DashboardIcon
        name={icon}
        className={cn('h-4 w-4', spinning && 'animate-spin text-primary')}
      />
    </button>
  )
}

/** Text link styled as a button — "View All" etc. */
export function TextLinkButton({
  children,
  onClick,
}: {
  children: ReactNode
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1 text-sm font-semibold text-primary transition-colors duration-150 hover:text-primary/80',
        dashboardPressableClass,
      )}
    >
      {children}
    </button>
  )
}

/** Card shell with shared hover lift — wraps KPI and metric tiles. */
export function PanelCard({
  children,
  className,
  interactive = true,
}: {
  children: ReactNode
  className?: string
  interactive?: boolean
}) {
  return (
    <article
      className={cn(
        'rounded-xl border border-border bg-background p-4 shadow-sm',
        interactive && dashboardHoverCardClass,
        className,
      )}
    >
      {children}
    </article>
  )
}
