import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface MetricCardProps {
  label: string
  value: number | string
  icon: ReactNode
  variant?: 'default' | 'warning'
}

/** Dashboard-style metric card — icon + uppercase label on top, bold value below. */
export function MetricCard({ label, value, icon, variant = 'default' }: MetricCardProps) {
  const isWarning = variant === 'warning'

  return (
    <div
      className={cn(
        'rounded-xl border px-4 py-4 sm:px-5 sm:py-4',
        isWarning ? 'border-warning-border bg-warning-surface' : 'border-border bg-background',
      )}
    >
      <div className="flex items-center gap-2">
        <span
          className={cn(
            'flex shrink-0 items-center justify-center',
            isWarning ? 'text-warning' : 'text-muted',
          )}
        >
          {icon}
        </span>
        <p
          className={cn(
            'text-[11px] font-medium tracking-wide uppercase',
            isWarning ? 'text-warning' : 'text-muted',
          )}
        >
          {label}
        </p>
      </div>
      <p
        className={cn(
          'mt-2 text-2xl font-bold',
          isWarning ? 'text-warning-foreground' : 'text-foreground',
        )}
      >
        {value}
      </p>
    </div>
  )
}
