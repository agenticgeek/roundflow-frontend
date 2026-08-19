import { Skeleton } from '@/components/ui/skeleton'
import {
  SkeletonAvatar,
  SkeletonButton,
  SkeletonCard,
  SkeletonLine,
  SkeletonMetricTile,
} from '@/components/ui/skeleton-cards'

/** Full Today's Work page skeleton — metrics, toolbar, rounds, workload. */
export function TodaysWorkScreenSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading today's work">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-48 rounded-md" />
          <Skeleton className="h-3 w-72 max-w-full rounded-md" />
          <Skeleton className="h-2.5 w-40 rounded-md" />
        </div>
        <div className="flex gap-2">
          <SkeletonButton />
          <SkeletonButton className="bg-primary/10" />
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
        {Array.from({ length: 7 }, (_, index) => (
          <SkeletonMetricTile key={index} />
        ))}
      </section>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Skeleton className="h-10 w-full rounded-lg sm:max-w-sm" />
        <Skeleton className="h-9 w-40 rounded-lg" />
      </div>

      <SkeletonCard label="Loading rounds" className="overflow-hidden p-0">
        <div className="border-b border-border px-5 py-4">
          <Skeleton className="h-3.5 w-32 rounded-md" />
        </div>
        <div className="divide-y divide-border">
          {Array.from({ length: 5 }, (_, index) => (
            <div key={index} className="grid gap-3 px-5 py-4 sm:grid-cols-[1.2fr_1fr_0.8fr_0.8fr_0.7fr]">
              <div className="flex items-center gap-3">
                <SkeletonAvatar size="sm" />
                <div className="space-y-2">
                  <SkeletonLine className="w-28" />
                  <SkeletonLine className="w-20" />
                </div>
              </div>
              <SkeletonLine className="w-24 self-center" />
              <SkeletonLine className="w-16 self-center" />
              <SkeletonLine className="w-14 self-center" />
              <SkeletonLine className="w-12 self-center" />
            </div>
          ))}
        </div>
      </SkeletonCard>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <SkeletonCard key={index} label="Loading technician workload">
            <div className="flex items-center gap-3">
              <SkeletonAvatar />
              <div className="space-y-2">
                <SkeletonLine className="w-24" />
                <SkeletonLine className="w-32" />
              </div>
            </div>
            <Skeleton className="mt-4 h-1.5 w-full rounded-full" />
            <div className="mt-3 flex justify-between">
              <SkeletonLine className="w-20" />
              <SkeletonLine className="w-16" />
            </div>
          </SkeletonCard>
        ))}
      </section>
    </div>
  )
}

/** Round detail panel stop list skeleton. */
export function TodaysWorkStopsSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <ul className="mt-3 space-y-2" aria-busy="true" aria-label="Loading stops">
      {Array.from({ length: rows }, (_, index) => (
        <li
          key={index}
          className="rounded-lg border border-border/70 bg-surface/60 px-3 py-3"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-2">
              <SkeletonLine className="w-32" />
              <SkeletonLine className="w-48 max-w-full" />
            </div>
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
        </li>
      ))}
    </ul>
  )
}
