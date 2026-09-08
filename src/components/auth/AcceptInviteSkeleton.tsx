import { Skeleton } from '@/components/ui/skeleton'
import { SkeletonLine } from '@/components/ui/skeleton-cards'

/** Accept-invite form skeleton while invite preview loads. */
export function AcceptInviteSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading invite">
      <div className="space-y-2 text-center sm:text-left">
        <Skeleton className="mx-auto h-7 w-48 rounded-md sm:mx-0" />
        <Skeleton className="mx-auto h-3 w-64 max-w-full rounded-md sm:mx-0" />
        <Skeleton className="mx-auto h-2.5 w-36 rounded-md sm:mx-0" />
      </div>
      <div className="space-y-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="space-y-2">
            <SkeletonLine className="w-24" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        ))}
        <Skeleton className="mt-2 h-12 w-full rounded-xl" />
      </div>
    </div>
  )
}
