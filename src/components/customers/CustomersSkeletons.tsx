import { Skeleton } from '@/components/ui/skeleton'
import {
  SkeletonAvatar,
  SkeletonButton,
  SkeletonCard,
  SkeletonLine,
  SkeletonMetricTile,
} from '@/components/ui/skeleton-cards'

/** Customers list skeleton. */
export function CustomersScreenSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading customers">
      <header className="space-y-2">
        <Skeleton className="h-7 w-40 rounded-md" />
        <SkeletonLine className="w-48" />
      </header>

      <SkeletonCard className="border-primary/15 bg-accent-surface/50 px-5 py-4" label="Loading tip">
        <SkeletonLine className="w-full max-w-xl" />
      </SkeletonCard>

      <Skeleton className="h-11 w-full rounded-lg" />

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <SkeletonMetricTile
              key={index}
              className="min-w-[8rem] border border-border/60 bg-card"
            />
          ))}
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-9 w-36 rounded-lg" />
          <Skeleton className="h-9 w-36 rounded-lg" />
        </div>
      </div>

      <section className="space-y-3">
        {Array.from({ length: 5 }, (_, index) => (
          <SkeletonCard key={index} label="Loading customer" className="flex items-center gap-4">
            <SkeletonAvatar />
            <div className="min-w-0 flex-1 space-y-2">
              <SkeletonLine className="w-40" />
              <SkeletonLine className="w-56 max-w-full" />
            </div>
            <Skeleton className="h-6 w-16 rounded-full" />
            <SkeletonButton />
          </SkeletonCard>
        ))}
      </section>
    </div>
  )
}
