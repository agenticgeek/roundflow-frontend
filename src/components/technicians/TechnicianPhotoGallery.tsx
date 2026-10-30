import { useState } from 'react'
import { DashboardIcon } from '@/components/dashboard/DashboardIcon'
import { PhotoGallery } from '@/components/photos/PhotoGallery'
import { technicianRecordsContent } from '@/content/technician-records'
import { useTechnicianPhotos, useVisitPhotos } from '@/features/photos/hooks/usePhotos'

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
  technicianName,
  visitId,
  onBack,
}: {
  technicianName: string
  visitId: string
  onBack: () => void
}) {
  const copy = technicianRecordsContent.photos
  const query = useVisitPhotos(visitId)
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
        onPage={() => undefined}
      />
    </div>
  )
}
