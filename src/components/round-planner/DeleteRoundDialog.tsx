import { useEffect, useState } from 'react'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { useToast } from '@/components/ui/toast'
import { confirmDialogContent } from '@/content/confirm-dialog'
import { useDeleteRound, useRoundDeletePreview } from '@/features/rounds/hooks/useRounds'
import {
  blockedReasons,
  deleteConflictMessage,
  deleteSummary,
  detachedNote,
  isRoundGone,
  propertiesLabel,
  upcomingVisitsLabel,
} from '@/features/rounds/lib/delete-round'
import { errorMessage } from '@/lib/errors'
import { fillCopy } from '@/lib/utils'

interface DeleteRoundDialogProps {
  /** The round to delete; `null` keeps the dialog closed. */
  round: { id: string; name: string } | null
  onClose: () => void
  /** The round is gone (deleted now, or already) — the planner drops it from its filter. */
  onDeleted: (roundId: string) => void
}

const copy = confirmDialogContent.round

/** Delete a round: loads GET /rounds/:id/delete-preview first, then DELETE /rounds/:id. */
export function DeleteRoundDialog({ round, onClose, onDeleted }: DeleteRoundDialogProps) {
  const { showToast } = useToast()
  const roundId = round?.id ?? ''
  const preview = useRoundDeletePreview(roundId, round !== null)
  const remove = useDeleteRound()
  const [error, setError] = useState<string | null>(null)

  // Reset the error whenever a different round is opened.
  useEffect(() => setError(null), [roundId])

  function handleGone() {
    showToast(copy.gone)
    onDeleted(roundId)
    onClose()
  }

  // The round went before the preview loaded (deleted elsewhere).
  const previewGone = isRoundGone(preview.error)
  useEffect(() => {
    if (previewGone) handleGone()
    // handleGone only depends on props that are stable while the dialog shows this round.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewGone])

  const data = preview.data
  const reasons = data ? blockedReasons(data) : []
  const detached = data && reasons.length === 0 ? detachedNote(data.detachedVisitCount) : null

  async function confirm() {
    if (!round || !data?.canDelete) return
    setError(null)
    try {
      const result = await remove.mutateAsync(round.id)
      showToast(copy.deleted, {
        description: fillCopy(copy.deletedDetail, {
          name: round.name,
          properties: propertiesLabel(result.unassignedProperties),
          visits: upcomingVisitsLabel(result.deletedVisits),
        }),
      })
      onDeleted(round.id)
      onClose()
    } catch (err) {
      if (isRoundGone(err)) {
        handleGone()
        return
      }
      const conflict = deleteConflictMessage(err)
      if (conflict) {
        setError(conflict)
        // Something changed since the preview — reload it so the reasons and the button match.
        void preview.refetch()
        return
      }
      setError(errorMessage(err))
    }
  }

  const description = preview.isPending
    ? copy.loading
    : data
      ? reasons.length > 0
        ? copy.blockedIntro
        : deleteSummary(data)
      : `${copy.previewFailed} ${errorMessage(preview.error)}`

  return (
    <ConfirmDialog
      open={round !== null && !previewGone}
      title={fillCopy(copy.title, { name: round?.name ?? '' })}
      description={description}
      confirmLabel={copy.confirm}
      pending={remove.isPending}
      confirmDisabled={!data?.canDelete || preview.isFetching}
      error={error}
      onConfirm={() => void confirm()}
      onClose={onClose}
    >
      {reasons.length > 0 ? (
        <ul aria-label={copy.blockedLabel} className="mt-3 list-disc space-y-1 pl-5 text-sm text-foreground">
          {reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      ) : null}
      {detached ? <p className="mt-3 text-sm text-muted">{detached}</p> : null}
    </ConfirmDialog>
  )
}
