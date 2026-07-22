import { Skeleton } from '@/components/ui/skeleton'

/** Generic setup-wizard step form skeleton. */
export function WizardFormSkeleton({ fields = 4 }: { fields?: number }) {
  return (
    <div className="space-y-6 py-2" aria-busy="true" aria-label="Loading step">
      <div className="flex items-start gap-4 border-b border-border pb-6">
        <Skeleton className="h-10 w-10 shrink-0" />
        <div className="space-y-2.5 pt-1">
          <Skeleton className="h-3.5 w-48" />
          <Skeleton className="h-2.5 w-72 max-w-full" />
        </div>
      </div>

      <div className="space-y-5">
        {Array.from({ length: fields }, (_, index) => (
          <div key={index} className="space-y-3 py-1">
            <Skeleton className="h-2.5 w-24" />
            <Skeleton className="h-3 w-[62%]" />
          </div>
        ))}
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-3 py-1">
            <Skeleton className="h-2.5 w-20" />
            <Skeleton className="h-3 w-[58%]" />
          </div>
          <div className="space-y-3 py-1">
            <Skeleton className="h-2.5 w-20" />
            <Skeleton className="h-3 w-[66%]" />
          </div>
        </div>
      </div>
    </div>
  )
}

/** Catalogue / technician list step skeleton. */
export function WizardListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-6 py-2" aria-busy="true" aria-label="Loading step">
      <div className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <Skeleton className="h-10 w-10 shrink-0" />
          <div className="space-y-2.5 pt-1">
            <Skeleton className="h-3.5 w-48" />
            <Skeleton className="h-2.5 w-64 max-w-full" />
          </div>
        </div>
        <div className="flex h-10 w-36 shrink-0 items-center gap-2 rounded-xl border border-border/70 px-3">
          <Skeleton className="h-3 w-3" />
          <Skeleton className="h-2.5 w-20" />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border">
        <div className="hidden grid-cols-4 gap-4 border-b border-border bg-surface/80 px-4 py-2.5 sm:grid">
          <Skeleton className="h-2 w-12" />
          <Skeleton className="h-2 w-14" />
          <Skeleton className="h-2 w-12" />
          <Skeleton className="h-2 w-16" />
        </div>
        <ul className="divide-y divide-border">
          {Array.from({ length: rows }, (_, index) => (
            <li key={index} className="grid gap-3 px-4 py-3.5 sm:grid-cols-4 sm:items-center">
              <div className="flex items-center gap-2">
                <Skeleton className="h-7 w-7" />
                <Skeleton className="h-2.5 w-20" />
              </div>
              <Skeleton className="h-2.5 w-24" />
              <Skeleton className="h-2.5 w-16" />
              <Skeleton className="h-5 w-14" />
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

/** Service area cards step skeleton. */
export function WizardCardsSkeleton({ cards = 3 }: { cards?: number }) {
  return (
    <div className="space-y-6 py-2" aria-busy="true" aria-label="Loading step">
      <div className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <Skeleton className="h-10 w-10 shrink-0" />
          <div className="space-y-2.5 pt-1">
            <Skeleton className="h-3.5 w-40" />
            <Skeleton className="h-2.5 w-56 max-w-full" />
          </div>
        </div>
        <div className="flex h-10 w-28 shrink-0 items-center gap-2 rounded-xl border border-border/70 px-3">
          <Skeleton className="h-3 w-3" />
          <Skeleton className="h-2.5 w-14" />
        </div>
      </div>

      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: cards }, (_, index) => (
          <li key={index} className="rounded-xl border border-border p-4">
            <Skeleton className="h-3 w-24" />
            <div className="mt-3 flex gap-1.5">
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-12" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
