import { useState } from 'react'
import type { PhotoType } from '@/api/photos.api'
import { PhotoGallery } from '@/components/photos/PhotoGallery'
import { propertyDetailContent } from '@/content/property-detail'
import { usePropertyPhotos } from '@/features/photos/hooks/usePhotos'
import { cn } from '@/lib/utils'

type PhotoFilter = PhotoType | 'ALL'

/** Property detail › Photos (GAP-019): the property's and its visits' photos, filterable by type. */
export function PropertyPhotosTab({ propertyId }: { propertyId: string }) {
  const copy = propertyDetailContent.photos
  const [filter, setFilter] = useState<PhotoFilter>('ALL')
  const [page, setPage] = useState(1)
  const query = usePropertyPhotos(propertyId, { type: filter === 'ALL' ? undefined : filter, page })

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-foreground">{copy.title}</h2>
        <div role="radiogroup" aria-label={copy.filterLabel} className="flex flex-wrap gap-2">
          {copy.filters.map((option) => {
            const selected = option.value === filter
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => {
                  setFilter(option.value)
                  setPage(1)
                }}
                className={cn(
                  'rounded-full border px-3 py-1 text-xs font-semibold transition-colors',
                  selected ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-muted',
                )}
              >
                {option.label}
              </button>
            )
          })}
        </div>
      </div>
      <PhotoGallery
        data={query.data}
        isLoading={query.isPending}
        isFetching={query.isFetching}
        error={query.error}
        onRetry={() => void query.refetch()}
        onPage={setPage}
      />
    </>
  )
}
