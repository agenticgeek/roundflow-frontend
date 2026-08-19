import { Skeleton } from '@/components/ui/skeleton'
import { SkeletonCard, SkeletonLine, SkeletonMetricTile } from '@/components/ui/skeleton-cards'

/** Property detail page skeleton. */
export function PropertyDetailSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading property">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <SkeletonLine className="w-24" />
          <Skeleton className="h-7 w-56 rounded-md" />
          <SkeletonLine className="w-72 max-w-full" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-28 rounded-lg" />
          <Skeleton className="h-9 w-28 rounded-lg" />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <SkeletonMetricTile key={index} className="border border-border/60 bg-card" />
        ))}
      </div>

      <SkeletonCard label="Loading tabs">
        <div className="flex gap-2 border-b border-border pb-3">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-8 w-24 rounded-lg" />
          ))}
        </div>
        <div className="mt-5 space-y-4">
          {Array.from({ length: 5 }, (_, index) => (
            <div key={index} className="flex justify-between gap-4">
              <SkeletonLine className="w-28" />
              <SkeletonLine className="w-40" />
            </div>
          ))}
        </div>
      </SkeletonCard>
    </div>
  )
}
