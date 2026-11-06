import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { PhotoReviewStatus, PhotoRow } from '@/api/photos.api'
import type { TechnicianRecord } from '@/content/technicians'
import { techniciansContent } from '@/content/technicians'
import { DashboardIcon } from '@/components/dashboard/DashboardIcon'
import { dashboardCtaClass, dashboardPressableClass } from '@/components/dashboard/dashboard-styles'
import { Input } from '@/components/ui'
import { Pager } from '@/components/ui/pager'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toast'
import { TechnicianChat } from '@/components/chat/TechnicianChat'
import { formatInvoiceDate } from '@/features/invoices/lib/mappers'
import { useReviewTechnicianPhotos, useTechnicianPhotos } from '@/features/photos/hooks/usePhotos'
import { groupPhotosByVisit, groupPhotosInOrder, groupReviewStatus, type PhotoGroup } from '@/features/photos/lib/group'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { errorMessage } from '@/lib/errors'
import { cn } from '@/lib/utils'

const SEARCH_DEBOUNCE_MS = 300
const ARCHIVE_PAGE_SIZE = 10 // visits per page

interface TechnicianConversationProps {
  technician: TechnicianRecord
  canMutate: boolean
  onBack: () => void
  onOpenVisit: (visitId: string) => void
  /** Ids of the pending photos in the current view — the modal confirms, then approves exactly these. */
  onApproveAll: (pendingPhotoIds: string[]) => void
}

export function TechnicianConversation({
  technician,
  canMutate,
  onBack,
  onOpenVisit,
  onApproveAll,
}: TechnicianConversationProps) {
  const content = techniciansContent.conversation
  const [searchParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [archiveOpen, setArchiveOpen] = useState(true)

  const debouncedSearch = useDebouncedValue(search.trim(), SEARCH_DEBOUNCE_MS)

  const query = useTechnicianPhotos(technician.id, page, { search: debouncedSearch, pageSize: ARCHIVE_PAGE_SIZE })
  const { showToast } = useToast()
  const reviewPhotos = useReviewTechnicianPhotos(technician.id)

  async function reviewVisit(group: PhotoGroup, status: 'APPROVED' | 'REJECTED') {
    try {
      await reviewPhotos.mutateAsync({ photoIds: groupPhotosInOrder(group).map((photo) => photo.id), status })
      showToast(status === 'APPROVED' ? content.visitApproved : content.visitRejected)
    } catch (error) {
      showToast(error instanceof Error ? error.message : content.reviewError)
    }
  }
  const groups = useMemo(
    () => groupPhotosByVisit(query.data?.rows ?? []).filter((group) => group.visitId),
    [query.data],
  )
  const pendingPhotoIds = useMemo(
    () => (query.data?.rows ?? []).filter((row) => row.reviewStatus === 'PENDING').map((row) => row.id),
    [query.data],
  )

  return (
    <div className="animate-slide-in-right space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <button type="button" onClick={onBack} className="inline-flex items-center gap-1 text-xs text-muted hover:text-foreground">
            <DashboardIcon name="chevron-left" className="h-3.5 w-3.5" />
            {content.back.replace('{name}', technician.name)}
          </button>
          <h1 className="mt-3 text-2xl font-semibold text-foreground">
            {content.title.replace('{name}', technician.name)}
          </h1>
          <p className="mt-1 text-sm text-muted">{content.subtitle}</p>
        </div>
      </header>

      <div className="mb-4 flex justify-end">
        <button
          type="button"
          disabled={!canMutate || pendingPhotoIds.length === 0}
          onClick={() => onApproveAll(pendingPhotoIds)}
          className={cn(dashboardCtaClass, 'disabled:opacity-50')}
        >
          {content.approveAll}
        </button>
      </div>
      <div className={cn('grid gap-6', archiveOpen && 'xl:grid-cols-[minmax(0,1.7fr)_minmax(19rem,0.8fr)]')}>
        <TechnicianChat technicianId={technician.id} initialRoundId={searchParams.get('round') ?? undefined} />

        {archiveOpen ? (
          <aside className="animate-slide-in-right rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-foreground">{content.archiveTitle}</h2>
                <p className="text-xs text-muted">{content.archiveSubtitle.replace('{name}', technician.name)}</p>
              </div>
              <button
                type="button"
                onClick={() => setArchiveOpen(false)}
                className="inline-flex items-center gap-1 rounded-lg bg-surface px-3 py-2 text-xs font-medium text-foreground"
              >
                {content.collapse}
                <DashboardIcon name="chevron-right" className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="relative mt-4">
              <DashboardIcon name="search" className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted" />
              <Input
                inputSize="sm"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value)
                  setPage(1)
                }}
                placeholder={content.search}
                className="pl-9"
              />
            </div>

            <p className="mt-5 text-[10px] font-semibold tracking-wide text-muted uppercase">{content.recentPhotos}</p>
            <div className="mt-3 space-y-3">
              {query.isPending ? (
                <Skeleton className="h-32 w-full rounded-xl" />
              ) : query.error && !query.data ? (
                <div role="alert" className="rounded-lg border border-border bg-surface px-4 py-6 text-center text-xs">
                  <p className="font-semibold text-foreground">{content.loadError}</p>
                  <p className="mt-1 text-muted">{errorMessage(query.error)}</p>
                  <button type="button" onClick={() => void query.refetch()} className="mt-3 font-semibold text-primary underline">
                    {content.retry}
                  </button>
                </div>
              ) : groups.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-xs text-muted">
                  {debouncedSearch ? content.emptySearch : content.empty}
                </p>
              ) : (
                groups.map((group) => (
                  <PhotoVisitCard
                    key={group.key}
                    group={group}
                    canReview={canMutate}
                    reviewPending={reviewPhotos.isPending}
                    onClick={() => onOpenVisit(group.visitId as string)}
                    onReview={(status) => void reviewVisit(group, status)}
                  />
                ))
              )}
            </div>
            {query.data && query.data.pagination.totalPages > 1 ? (
              <Pager pagination={query.data.pagination} loading={query.isFetching} onPage={setPage} />
            ) : null}
          </aside>
        ) : (
          <button
            type="button"
            onClick={() => setArchiveOpen(true)}
            className="fixed right-4 bottom-6 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-lg"
          >
            {content.archiveTitle}
          </button>
        )}
      </div>
    </div>
  )
}

function PhotoVisitCard({
  group,
  canReview,
  reviewPending,
  onClick,
  onReview,
}: {
  group: PhotoGroup
  canReview: boolean
  reviewPending: boolean
  onClick: () => void
  onReview: (status: 'APPROVED' | 'REJECTED') => void
}) {
  const content = techniciansContent.conversation
  const tiles: { photo: PhotoRow; label: string }[] = []
  if (group.before[0]) tiles.push({ photo: group.before[0], label: content.before })
  if (group.after[0]) tiles.push({ photo: group.after[0], label: content.after })
  const title = group.address ?? content.visitFallback
  const status = groupReviewStatus(group)
  return (
    <div className="rounded-xl border border-border p-3 transition-colors hover:border-primary/30">
      <button type="button" onClick={onClick} className={cn(dashboardPressableClass, 'w-full text-left')}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">{title}</p>
            <p className="text-[10px] text-muted">
              {[group.jobRef, group.customerName, formatInvoiceDate(group.visitDate)].filter(Boolean).join(' · ')}
            </p>
          </div>
          <PhotoStatus status={status} />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {tiles.map(({ photo, label }) => {
            const src = photo.thumbnailUrl ?? photo.url
            return (
              <div key={photo.id}>
                {src ? (
                  <img src={src} alt="" loading="lazy" className="h-20 w-full rounded-lg object-cover" />
                ) : (
                  <div className="h-20 w-full rounded-lg bg-surface" />
                )}
                <span className="mt-1 block text-[10px] text-muted">{label}</span>
              </div>
            )
          })}
        </div>
      </button>
      {canReview && status !== 'APPROVED' ? (
        <div className="mt-3 flex justify-end gap-2">
          {status !== 'REJECTED' ? (
            <button
              type="button"
              disabled={reviewPending}
              onClick={() => onReview('REJECTED')}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-danger disabled:opacity-50"
            >
              {content.reject}
            </button>
          ) : null}
          <button
            type="button"
            disabled={reviewPending}
            onClick={() => onReview('APPROVED')}
            className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
          >
            {content.approve}
          </button>
        </div>
      ) : null}
    </div>
  )
}

const STATUS_CLASSES: Record<PhotoReviewStatus, string> = {
  APPROVED: 'bg-success/10 text-success',
  PENDING: 'bg-primary/10 text-primary',
  REJECTED: 'bg-danger/10 text-danger',
}

function PhotoStatus({ status }: { status: PhotoReviewStatus }) {
  return (
    <span className={cn('rounded-lg px-2 py-1 text-[10px] font-semibold', STATUS_CLASSES[status])}>
      {techniciansContent.conversation.status[status]}
    </span>
  )
}
