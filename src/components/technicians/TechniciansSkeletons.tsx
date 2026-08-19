import { Skeleton } from '@/components/ui/skeleton'
import {
  SkeletonAvatar,
  SkeletonButton,
  SkeletonCard,
  SkeletonLine,
  SkeletonMetricTile,
} from '@/components/ui/skeleton-cards'

/** Technicians overview skeleton — metrics + team cards. */
export function TechniciansOverviewSkeleton({ cards = 3 }: { cards?: number }) {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading technicians">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-40 rounded-md" />
          <Skeleton className="h-3 w-72 max-w-full rounded-md" />
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <SkeletonLine className="w-36" />
          <SkeletonButton className="bg-primary/10" />
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <SkeletonMetricTile key={index} className="border border-border/60 bg-card shadow-sm" />
        ))}
      </section>

      <section className="space-y-4">
        {Array.from({ length: cards }, (_, index) => (
          <SkeletonCard key={index} label="Loading technician">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <SkeletonAvatar />
                <div className="space-y-2">
                  <SkeletonLine className="w-28" />
                  <SkeletonLine className="w-20" />
                </div>
              </div>
              <Skeleton className="h-6 w-20 rounded-lg" />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4 border-y border-border py-4 lg:grid-cols-4">
              {Array.from({ length: 4 }, (_, metric) => (
                <div key={metric} className="space-y-2">
                  <SkeletonLine className="w-14" />
                  <Skeleton className="h-5 w-10 rounded-md" />
                </div>
              ))}
            </div>

            <div className="mt-4 space-y-3">
              <SkeletonLine className="w-32" />
              <Skeleton className="h-10 w-full rounded-lg" />
              <Skeleton className="h-10 w-full rounded-lg" />
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <SkeletonButton />
              <SkeletonLine className="w-20 self-center" />
              <SkeletonLine className="w-20 self-center" />
            </div>
          </SkeletonCard>
        ))}
      </section>
    </div>
  )
}

/** Technician detail / edit loading shell. */
export function TechnicianDetailSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading technician">
      <div className="space-y-3">
        <SkeletonLine className="w-24" />
        <Skeleton className="h-7 w-48 rounded-md" />
        <SkeletonLine className="w-56" />
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.7fr)_minmax(18rem,0.9fr)]">
        <div className="space-y-5">
          <SkeletonCard label="Loading activity">
            <SkeletonLine className="w-36" />
            <div className="mt-5 space-y-4">
              {Array.from({ length: 3 }, (_, index) => (
                <div key={index} className="flex items-center justify-between gap-3">
                  <SkeletonLine className="w-40" />
                  <Skeleton className="h-5 w-20 rounded-lg" />
                </div>
              ))}
            </div>
          </SkeletonCard>
          <SkeletonCard label="Loading performance">
            <SkeletonLine className="w-44" />
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {Array.from({ length: 3 }, (_, index) => (
                <div key={index} className="rounded-xl border border-border p-4">
                  <SkeletonLine className="w-16" />
                  <Skeleton className="mt-3 h-6 w-14 rounded-md" />
                </div>
              ))}
            </div>
          </SkeletonCard>
        </div>

        <div className="space-y-5">
          <SkeletonCard label="Loading info">
            <SkeletonLine className="w-32" />
            <div className="mt-5 space-y-4">
              {Array.from({ length: 6 }, (_, index) => (
                <div key={index} className="flex justify-between gap-4">
                  <SkeletonLine className="w-20" />
                  <SkeletonLine className="w-28" />
                </div>
              ))}
            </div>
          </SkeletonCard>
          <SkeletonCard label="Loading workload">
            <SkeletonLine className="w-36" />
            <div className="mt-5 space-y-4">
              {Array.from({ length: 2 }, (_, index) => (
                <div key={index}>
                  <div className="flex justify-between gap-3">
                    <SkeletonLine className="w-28" />
                    <SkeletonLine className="w-16" />
                  </div>
                  <Skeleton className="mt-2 h-1.5 w-full rounded-full" />
                </div>
              ))}
            </div>
          </SkeletonCard>
        </div>
      </div>
    </div>
  )
}

/** Add/edit technician form skeleton. */
export function TechnicianFormSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading technician form">
      <div className="space-y-2">
        <Skeleton className="h-6 w-44 rounded-md" />
        <SkeletonLine className="w-64" />
      </div>
      <SkeletonCard className="sm:p-6" label="Loading form">
        <SkeletonLine className="w-36" />
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="space-y-2">
              <SkeletonLine className="w-20" />
              <Skeleton className="h-9 w-full rounded-lg" />
            </div>
          ))}
        </div>
        <div className="mt-6 border-t border-border pt-6">
          <SkeletonLine className="w-28" />
          <div className="mt-4 flex items-center justify-between gap-4">
            <div className="space-y-2">
              <SkeletonLine className="w-40" />
              <SkeletonLine className="w-56" />
            </div>
            <Skeleton className="h-6 w-11 rounded-full" />
          </div>
        </div>
      </SkeletonCard>
    </div>
  )
}
