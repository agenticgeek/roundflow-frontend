import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

/** Soft elevated card shell for premium loading placeholders. */
export function SkeletonCard({
  className,
  children,
  label = 'Loading',
}: {
  className?: string
  children: React.ReactNode
  label?: string
}) {
  return (
    <article
      className={cn(
        'rounded-xl border border-border/80 bg-card p-5 shadow-sm ring-1 ring-black/[0.02]',
        className,
      )}
      aria-busy="true"
      aria-label={label}
    >
      {children}
    </article>
  )
}

export function SkeletonMetricTile({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'rounded-xl border border-transparent bg-accent-surface px-4 py-4',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <Skeleton className="h-3 w-24 rounded-md" />
        <Skeleton className="h-4 w-4 rounded-md" />
      </div>
      <Skeleton className="mt-4 h-7 w-20 rounded-md" />
      <Skeleton className="mt-3 h-2.5 w-28 rounded-md" />
    </div>
  )
}

export function SkeletonAvatar({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClass = size === 'sm' ? 'h-8 w-8' : size === 'lg' ? 'h-12 w-12' : 'h-10 w-10'
  return <Skeleton className={cn(sizeClass, 'shrink-0 rounded-full')} />
}

export function SkeletonLine({ className }: { className?: string }) {
  return <Skeleton className={cn('h-2.5 rounded-md', className)} />
}

export function SkeletonButton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'inline-flex h-9 items-center gap-2 rounded-lg border border-border/70 bg-background/60 px-3',
        className,
      )}
    >
      <Skeleton className="h-3 w-3 rounded-md" />
      <Skeleton className="h-2.5 w-16 rounded-md" />
    </div>
  )
}

export function SkeletonTableRows({
  rows = 4,
  cols = 5,
}: {
  rows?: number
  cols?: number
}) {
  return (
    <div className="overflow-hidden">
      <div
        className="grid gap-3 border-y border-border px-5 py-3"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: cols }, (_, index) => (
          <Skeleton key={`head-${index}`} className="h-2.5 w-16 rounded-md" />
        ))}
      </div>
      {Array.from({ length: rows }, (_, row) => (
        <div
          key={row}
          className="grid gap-3 border-b border-border px-5 py-3.5 last:border-b-0"
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: cols }, (_, col) => (
            <Skeleton
              key={col}
              className={cn('h-3 rounded-md', col === 0 ? 'w-[70%]' : 'w-12')}
            />
          ))}
        </div>
      ))}
    </div>
  )
}
