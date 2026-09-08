import { Skeleton } from '@/components/ui/skeleton'
import {
  SkeletonButton,
  SkeletonCard,
  SkeletonLine,
  SkeletonMetricTile,
  SkeletonTableRows,
} from '@/components/ui/skeleton-cards'

/** Reports overview skeleton — KPIs, chart, tables, activity. */
export function ReportsScreenSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading reports">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-52 rounded-md" />
          <Skeleton className="h-3 w-80 max-w-full rounded-md" />
        </div>
        <div className="flex flex-wrap gap-2">
          <SkeletonLine className="w-32 self-center" />
          <Skeleton className="h-9 w-28 rounded-lg" />
          <SkeletonButton />
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <SkeletonMetricTile key={index} />
        ))}
      </section>

      <ReportsChartSkeleton />
      <ReportsTableSkeleton titleClassName="w-48" rows={2} />
      <ReportsTableSkeleton titleClassName="w-36" rows={3} cols={6} />
      <ReportsActivitySkeleton />
    </div>
  )
}

export function ReportsChartSkeleton() {
  return (
    <SkeletonCard label="Loading revenue" className="p-5">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <SkeletonLine className="w-40" />
          <SkeletonLine className="w-24" />
        </div>
        <div className="inline-flex gap-1 rounded-lg bg-surface p-1">
          <Skeleton className="h-8 w-16 rounded-md" />
          <Skeleton className="h-8 w-16 rounded-md" />
          <Skeleton className="h-8 w-16 rounded-md" />
        </div>
      </div>
      <div className="relative h-[250px] overflow-hidden rounded-lg bg-surface/50">
        <div className="absolute inset-x-12 inset-y-6 flex flex-col justify-between">
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={index} className="h-px w-full rounded-none opacity-60" />
          ))}
        </div>
        <Skeleton className="absolute inset-x-16 bottom-10 h-24 w-[70%] rounded-[2rem] opacity-40" />
      </div>
    </SkeletonCard>
  )
}

export function ReportsTableSkeleton({
  titleClassName = 'w-44',
  rows = 4,
  cols = 5,
}: {
  titleClassName?: string
  rows?: number
  cols?: number
}) {
  return (
    <SkeletonCard label="Loading table" className="overflow-hidden p-0">
      <div className="flex items-center justify-between gap-3 px-5 py-4">
        <Skeleton className={`h-3.5 rounded-md ${titleClassName}`} />
        <SkeletonButton />
      </div>
      <SkeletonTableRows rows={rows} cols={cols} />
    </SkeletonCard>
  )
}

export function ReportsActivitySkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <SkeletonCard label="Loading activity" className="p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <SkeletonLine className="w-44" />
        <SkeletonButton />
      </div>
      <ul className="space-y-3">
        {Array.from({ length: rows }, (_, index) => (
          <li
            key={index}
            className="flex items-center gap-3 rounded-xl border border-border bg-background px-3.5 py-3"
          >
            <Skeleton className="h-10 w-10 shrink-0 rounded-lg" />
            <div className="min-w-0 flex-1 space-y-2">
              <SkeletonLine className="w-[70%]" />
              <SkeletonLine className="w-40" />
            </div>
          </li>
        ))}
      </ul>
    </SkeletonCard>
  )
}

/** Metric tiles only — used while summary refetches with existing layout. */
export function ReportsMetricsSkeleton() {
  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-busy="true" aria-label="Loading metrics">
      {Array.from({ length: 4 }, (_, index) => (
        <SkeletonMetricTile key={index} />
      ))}
    </section>
  )
}
