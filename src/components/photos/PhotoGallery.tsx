import { useEffect, useState } from 'react'
import type { PhotoPage, PhotoRow } from '@/api/photos.api'
import { Pager } from '@/components/ui/pager'
import { Modal, ModalButton } from '@/components/ui/modal'
import { Skeleton } from '@/components/ui/skeleton'
import { sharedActionsContent } from '@/content/shared-actions'
import { formatInvoiceDate } from '@/features/invoices/lib/mappers'
import { groupPhotosByVisit, groupPhotosInOrder, type PhotoGroup } from '@/features/photos/lib/group'
import { errorMessage } from '@/lib/errors'

const copy = sharedActionsContent.photos

function typeLabel(photo: PhotoRow) {
  if (photo.type === 'BEFORE') return copy.before
  if (photo.type === 'AFTER') return copy.after
  if (photo.type === 'ACCESS_ISSUE') return copy.accessIssue
  return copy.property
}

function groupTitle(group: PhotoGroup) {
  return group.visitId ? copy.visit.replace('{date}', formatInvoiceDate(group.visitDate)) : copy.noVisit
}

function PhotoTile({ photo, onOpen }: { photo: PhotoRow; onOpen: () => void }) {
  const label = typeLabel(photo)
  const src = photo.thumbnailUrl ?? photo.url
  return (
    <figure className="min-w-0">
      {src ? (
        <button
          type="button"
          onClick={onOpen}
          aria-label={copy.open.replace('{label}', label)}
          className="block aspect-square w-full overflow-hidden rounded-lg border border-border bg-surface"
        >
          <img src={src} alt={label} loading="lazy" className="h-full w-full object-cover" />
        </button>
      ) : (
        <div className="flex aspect-square w-full items-center justify-center rounded-lg border border-dashed border-border bg-surface px-2 text-center text-xs text-muted">
          {copy.unavailable}
        </div>
      )}
      <figcaption className="mt-1 text-xs font-semibold text-muted">{label}</figcaption>
    </figure>
  )
}

function Lightbox({ photos, index, onIndex, onClose }: {
  photos: PhotoRow[]
  index: number
  onIndex: (index: number) => void
  onClose: () => void
}) {
  const photo = photos[index]
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'ArrowLeft' && index > 0) onIndex(index - 1)
      if (event.key === 'ArrowRight' && index < photos.length - 1) onIndex(index + 1)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [index, onIndex, photos.length])

  const label = typeLabel(photo)
  return (
    <Modal open onClose={onClose} title={copy.lightboxTitle} subtitle={label} maxWidthClass="max-w-3xl" showCloseButton>
      {photo.url ? (
        <img src={photo.url} alt={label} className="max-h-[70vh] w-full object-contain" />
      ) : (
        <p className="py-10 text-center text-sm text-muted">{copy.unavailable}</p>
      )}
      <div className="mt-4 flex items-center justify-between gap-3">
        <ModalButton compact aria-label={copy.previous} disabled={index === 0} onClick={() => onIndex(index - 1)}>
          ‹
        </ModalButton>
        <p className="text-sm text-muted">
          {copy.counter.replace('{index}', String(index + 1)).replace('{total}', String(photos.length))}
          {photo.technician?.name ? ` · ${copy.takenBy.replace('{name}', photo.technician.name)}` : ''}
        </p>
        <ModalButton
          compact
          aria-label={copy.next}
          disabled={index === photos.length - 1}
          onClick={() => onIndex(index + 1)}
        >
          ›
        </ModalButton>
      </div>
    </Modal>
  )
}

/**
 * Photo gallery (GAP-019): one card per visit with its before / after photos, a lightbox and
 * pagination. Feed it a photo query (`usePropertyPhotos` / `useTechnicianPhotos`).
 */
export function PhotoGallery({
  data,
  isLoading,
  isFetching = false,
  error,
  onRetry,
  onPage,
}: {
  data: PhotoPage | undefined
  isLoading: boolean
  isFetching?: boolean
  error: unknown
  onRetry: () => void
  onPage: (page: number) => void
}) {
  const [open, setOpen] = useState<{ photos: PhotoRow[]; index: number } | null>(null)

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-busy="true">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="aspect-square w-full rounded-lg" />
        ))}
      </div>
    )
  }

  if (error && !data) {
    return (
      <div role="alert" className="rounded-lg border border-border bg-surface px-4 py-6 text-center text-sm">
        <p className="font-semibold text-foreground">{copy.loadError}</p>
        <p className="mt-1 text-muted">{errorMessage(error)}</p>
        <button type="button" onClick={onRetry} className="mt-3 font-semibold text-primary underline">
          {copy.retry}
        </button>
      </div>
    )
  }

  if (!data || data.rows.length === 0) {
    return <p className="rounded-lg border border-dashed border-border px-4 py-10 text-center text-sm text-muted">{copy.empty}</p>
  }

  const groups = groupPhotosByVisit(data.rows)
  return (
    <div className="space-y-4">
      {groups.map((group) => {
        const ordered = groupPhotosInOrder(group)
        return (
          <section key={group.key} className="rounded-xl border border-border bg-card p-4">
            <header className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-sm font-semibold text-foreground">{groupTitle(group)}</h3>
              {group.technicianName ? (
                <span className="text-xs text-muted">{copy.takenBy.replace('{name}', group.technicianName)}</span>
              ) : null}
            </header>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {ordered.map((photo, index) => (
                <PhotoTile key={photo.id} photo={photo} onOpen={() => setOpen({ photos: ordered, index })} />
              ))}
            </div>
          </section>
        )
      })}
      {data.pagination.totalPages > 1 ? (
        <Pager pagination={data.pagination} loading={isFetching} onPage={onPage} />
      ) : null}
      {open ? (
        <Lightbox
          photos={open.photos}
          index={open.index}
          onIndex={(index) => setOpen({ photos: open.photos, index })}
          onClose={() => setOpen(null)}
        />
      ) : null}
    </div>
  )
}
