import type { ReactNode } from 'react'
import { DashboardIcon } from '@/components/dashboard/DashboardIcon'
import { cn } from '@/lib/utils'

export interface ComingSoonCopy {
  badge: string
  title: string
  description: string
}

interface ComingSoonOverlayProps {
  copy: ComingSoonCopy
  /** Icon shown in the badge. */
  icon?: string
  /** The mocked UI to blur behind the overlay. */
  children: ReactNode
  className?: string
}

/**
 * Blurs a not-yet-integrated screen behind a "Coming Soon" message.
 * The children are made non-interactive and hidden from assistive tech.
 */
export function ComingSoonOverlay({ copy, icon = 'info', children, className }: ComingSoonOverlayProps) {
  return (
    <div className={cn('relative overflow-hidden rounded-xl', className)}>
      <div aria-hidden="true" className="pointer-events-none blur-sm select-none">
        {children}
      </div>

      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/50 px-6 text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          <DashboardIcon name={icon} className="h-3.5 w-3.5" />
          {copy.badge}
        </span>
        <h2 className="text-base font-semibold text-foreground">{copy.title}</h2>
        <p className="max-w-xs text-sm text-muted">{copy.description}</p>
      </div>
    </div>
  )
}
