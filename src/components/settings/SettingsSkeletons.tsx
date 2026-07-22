import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

const cardClass = 'rounded-lg border border-border bg-card shadow-sm'

function PanelHeaderSkeleton({ withAction = true }: { withAction?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border pb-5">
      <div className="flex items-start gap-3">
        <Skeleton className="h-10 w-10 shrink-0" />
        <div className="space-y-2.5 pt-1">
          <Skeleton className="h-3.5 w-44" />
          <Skeleton className="h-2.5 w-64 max-w-full" />
        </div>
      </div>
      {withAction ? (
        <div className="flex h-9 w-36 shrink-0 items-center gap-2 rounded-xl border border-border/70 px-3">
          <Skeleton className="h-3 w-3" />
          <Skeleton className="h-2.5 w-20" />
        </div>
      ) : null}
    </div>
  )
}

function FormFieldSkeleton() {
  return (
    <div className="space-y-3 py-1">
      <Skeleton className="h-2.5 w-24" />
      <Skeleton className="h-3 w-[62%]" />
    </div>
  )
}

/** Business profile / payment rules / round settings form skeleton. */
export function SettingsFormSkeleton({
  fields = 4,
  withAction = true,
}: {
  fields?: number
  withAction?: boolean
}) {
  return (
    <article className={cn(cardClass, 'p-6')} aria-busy="true" aria-label="Loading settings">
      <PanelHeaderSkeleton withAction={withAction} />
      <div className="mt-6 space-y-5">
        {Array.from({ length: fields }, (_, index) => (
          <FormFieldSkeleton key={index} />
        ))}
        <div className="grid gap-5 sm:grid-cols-2">
          <FormFieldSkeleton />
          <FormFieldSkeleton />
        </div>
      </div>
    </article>
  )
}

/** Payment panel with provider cards + rules. */
export function SettingsPaymentSkeleton() {
  return (
    <article className={cn(cardClass, 'p-6')} aria-busy="true" aria-label="Loading payment settings">
      <PanelHeaderSkeleton />
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {[0, 1].map((index) => (
          <div key={index} className="rounded-xl border border-border p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-2.5">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-2.5 w-40" />
              </div>
              <Skeleton className="h-5 w-20" />
            </div>
            <div className="mt-4 flex h-9 w-28 items-center justify-center rounded-xl border border-border/70">
              <Skeleton className="h-2.5 w-16" />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-6 space-y-5">
        <FormFieldSkeleton />
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-2.5 w-48" />
          </div>
          <Skeleton className="h-6 w-11 rounded-full" />
        </div>
      </div>
    </article>
  )
}

/** Technician management table skeleton — matches the live table layout. */
export function SettingsTechniciansSkeleton() {
  return (
    <article
      className={cn(cardClass, 'p-6')}
      aria-busy="true"
      aria-label="Loading technicians"
    >
      <PanelHeaderSkeleton />
      <div className="mt-6 overflow-hidden rounded-xl border border-border">
        <div className="hidden grid-cols-[1.4fr_1fr_1fr_0.9fr_3rem] gap-4 border-b border-border bg-surface/80 px-4 py-2.5 sm:grid">
          <Skeleton className="h-2 w-12" />
          <Skeleton className="h-2 w-14" />
          <Skeleton className="h-2 w-12" />
          <Skeleton className="h-2 w-20" />
          <span />
        </div>
        <ul className="divide-y divide-border">
          {[0, 1, 2, 3].map((index) => (
            <li
              key={index}
              className="grid gap-3 px-4 py-3.5 sm:grid-cols-[1.4fr_1fr_1fr_0.9fr_3rem] sm:items-center"
            >
              <div className="flex items-center gap-2">
                <Skeleton className="h-7 w-7 shrink-0" />
                <Skeleton className="h-2.5 w-20" />
              </div>
              <Skeleton className="h-2.5 w-24" />
              <Skeleton className="h-2.5 w-14" />
              <Skeleton className="h-5 w-14" />
              <div className="flex justify-self-end gap-1">
                <Skeleton className="h-1.5 w-1.5" />
                <Skeleton className="h-1.5 w-1.5" />
                <Skeleton className="h-1.5 w-1.5" />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </article>
  )
}

/** Service areas card grid skeleton. */
export function SettingsServiceAreasSkeleton() {
  return (
    <article
      className={cn(cardClass, 'p-6')}
      aria-busy="true"
      aria-label="Loading service areas"
    >
      <PanelHeaderSkeleton />
      <ul className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2].map((index) => (
          <li key={index} className="rounded-xl border border-border p-4">
            <div className="flex items-start justify-between gap-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-3" />
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-12" />
            </div>
            <Skeleton className="mt-3 h-2.5 w-36" />
          </li>
        ))}
      </ul>
    </article>
  )
}

/** Service catalogue table skeleton. */
export function SettingsServicesSkeleton() {
  return (
    <article
      className={cn(cardClass, 'p-6')}
      aria-busy="true"
      aria-label="Loading services"
    >
      <PanelHeaderSkeleton />
      <div className="mt-6 overflow-hidden rounded-xl border border-border">
        <div className="hidden grid-cols-[1fr_7rem_6rem_8.5rem] gap-4 border-b border-border bg-surface/80 px-5 py-3 sm:grid">
          <Skeleton className="h-2 w-16" />
          <Skeleton className="h-2 w-20 justify-self-end" />
          <Skeleton className="h-2 w-12 justify-self-center" />
          <span />
        </div>
        <ul className="divide-y divide-border">
          {[0, 1, 2, 3].map((index) => (
            <li
              key={index}
              className="grid gap-4 px-5 py-4 sm:grid-cols-[1fr_7rem_6rem_8.5rem] sm:items-center"
            >
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-3 w-36" />
                  <Skeleton className="h-4 w-16" />
                </div>
                <Skeleton className="h-2.5 w-56 max-w-full" />
              </div>
              <Skeleton className="h-3 w-12 justify-self-end" />
              <Skeleton className="h-6 w-11 justify-self-center rounded-full" />
              <div className="flex gap-2">
                <div className="flex h-8 w-14 items-center justify-center rounded-lg border border-border/70">
                  <Skeleton className="h-2 w-8" />
                </div>
                <div className="flex h-8 w-16 items-center justify-center rounded-lg border border-border/70">
                  <Skeleton className="h-2 w-10" />
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </article>
  )
}

/** SMS templates read-only list skeleton. */
export function SettingsSmsSkeleton() {
  return (
    <article className={cn(cardClass, 'p-6')} aria-busy="true" aria-label="Loading templates">
      <PanelHeaderSkeleton withAction={false} />
      <div className="mt-6 space-y-2 rounded-xl border border-border/70 px-4 py-3">
        <Skeleton className="h-2.5 w-[84%]" />
        <Skeleton className="h-2.5 w-[62%]" />
      </div>
      <ul className="mt-5 space-y-2">
        {[0, 1, 2].map((index) => (
          <li key={index} className="rounded-xl border border-border px-4 py-3">
            <Skeleton className="h-3 w-36" />
            <Skeleton className="mt-2 h-2.5 w-[78%]" />
          </li>
        ))}
      </ul>
    </article>
  )
}
