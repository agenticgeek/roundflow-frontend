import { useState } from 'react'
import type { PhotoRow } from '@/api/photos.api'
import { DashboardIcon } from '@/components/dashboard/DashboardIcon'
import { PhotoGallery } from '@/components/photos/PhotoGallery'
import { technicianRecordsContent } from '@/content/technician-records'
import { useToast } from '@/components/ui/toast'
import { useReviewTechnicianPhotos, useTechnicianPhotos, useVisitPhotos } from '@/features/photos/hooks/usePhotos'

/** Technician detail › Photos: before/after photos from the technician's visits (GAP-019). */
export function TechnicianPhotoGallery({ technicianId }: { technicianId: string }) {
  const [page, setPage] = useState(1)
  const query = useTechnicianPhotos(technicianId, page)
  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <h2 className="text-base font-semibold text-foreground">{technicianRecordsContent.photos.title}</h2>
      <div className="mt-4">
        <PhotoGallery
          data={query.data}
          isLoading={query.isPending}
          isFetching={query.isFetching}
          error={query.error}
          onRetry={() => void query.refetch()}
          onPage={setPage}
        />
      </div>
    </section>
  )
}

/** `/technicians/:technicianId/photos/:visitId` — one visit's before / after photos (GAP-019). */
export function TechnicianVisitPhotos({
  technicianId,
  technicianName,
  visitId,
  canMutate,
  onBack,
}: {
  technicianId: string
  technicianName: string
  visitId: string
  canMutate: boolean
  onBack: () => void
}) {
  const copy = technicianRecordsContent.photos
  const query = useVisitPhotos(visitId)
  const { showToast } = useToast()
  const reviewPhotos = useReviewTechnicianPhotos(technicianId)

  async function review(photo: PhotoRow, status: 'APPROVED' | 'REJECTED') {
    try {
      await reviewPhotos.mutateAsync({ photoIds: [photo.id], status })
      showToast(status === 'APPROVED' ? 'Photo approved.' : 'Photo rejected.')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Could not update the photo')
    }
  }
  return (
    <div className="animate-slide-in-right space-y-5">
      <header className="border-b border-border pb-5">
        <button type="button" onClick={onBack} className="inline-flex items-center gap-1 text-xs text-muted hover:text-foreground">
          <DashboardIcon name="chevron-left" className="h-3.5 w-3.5" />
          {copy.back.replace('{name}', technicianName)}
        </button>
        <h1 className="mt-3 text-2xl font-semibold text-foreground">{copy.visitTitle}</h1>
      </header>
      <PhotoGallery
        data={query.data}
        isLoading={query.isPending}
        error={query.error}
        onRetry={() => void query.refetch()}
        onPage={() => undefined} // GET /visits/:id/photos is a single, unpaginated page
        review={canMutate ? { pending: reviewPhotos.isPending, onReview: (photo, status) => void review(photo, status) } : undefined}
      />
    </div>
  )
}
