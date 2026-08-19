import { Skeleton } from '@/components/ui/skeleton'
import {
  SkeletonButton,
  SkeletonCard,
  SkeletonLine,
  SkeletonMetricTile,
} from '@/components/ui/skeleton-cards'

/** Debt board page skeleton — KPI strip, filters, buckets, customer cards. */
export function DebtPaymentScreenSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading debt board">
      <header className="space-y-2">
        <Skeleton className="h-7 w-72 max-w-full rounded-md" />
        <Skeleton className="h-3 w-96 max-w-full rounded-md" />
      </header>

      <DebtKpisSkeleton />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <Skeleton className="h-10 w-full rounded-lg lg:flex-1" />
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-9 w-40 rounded-lg" />
          <Skeleton className="h-9 w-36 rounded-lg" />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {Array.from({ length: 7 }, (_, index) => (
          <div
            key={index}
            className="rounded-2xl border-2 border-border bg-card px-5 py-5 shadow-sm"
          >
            <Skeleton className="h-8 w-10 rounded-md" />
            <Skeleton className="mt-3 h-3 w-20 rounded-md" />
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between gap-3">
        <SkeletonLine className="w-40" />
        <SkeletonLine className="w-24" />
      </div>

      <DebtBoardCardsSkeleton />
    </div>
  )
}

export function DebtKpisSkeleton() {
  return (
    <div
      className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5"
      aria-busy="true"
      aria-label="Loading KPIs"
    >
      {Array.from({ length: 5 }, (_, index) => (
        <SkeletonMetricTile
          key={index}
          className="border border-border/70 bg-card shadow-sm"
        />
      ))}
    </div>
  )
}

export function DebtBoardCardsSkeleton({ cards = 4 }: { cards?: number }) {
  return (
    <div className="grid gap-3 lg:grid-cols-2" aria-busy="true" aria-label="Loading debt cards">
      {Array.from({ length: cards }, (_, index) => (
        <SkeletonCard key={index} label="Loading customer" className="border-2">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <Skeleton className="mt-1 h-4 w-4 rounded-md" />
              <div className="space-y-2">
                <SkeletonLine className="w-32" />
                <SkeletonLine className="w-48 max-w-full" />
              </div>
            </div>
            <div className="flex gap-2">
              <SkeletonButton />
              <Skeleton className="h-8 w-20 rounded-lg" />
              <Skeleton className="h-8 w-8 rounded-lg" />
            </div>
          </div>
          <Skeleton className="mt-4 h-5 w-28 rounded-md" />
          <div className="mt-4 flex items-end justify-between gap-3">
            <SkeletonLine className="w-20" />
            <SkeletonLine className="w-28" />
          </div>
        </SkeletonCard>
      ))}
    </div>
  )
}
