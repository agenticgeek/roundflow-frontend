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
        'animate-pulse rounded-md bg-gradient-to-r from-border/35 via-border/70 to-border/35 bg-[length:200%_100%]',
        className,
      )}
      {...props}
    />
  )
}
