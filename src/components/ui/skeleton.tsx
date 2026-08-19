import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

/** Soft content-shaped placeholder used for loading states. */
export function Skeleton({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'animate-pulse rounded-full bg-gradient-to-r from-border/45 via-border/80 to-border/45',
        className,
      )}
      {...props}
    />
  )
}
