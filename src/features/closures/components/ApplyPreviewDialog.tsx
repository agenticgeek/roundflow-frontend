import { useEffect, useRef, useState } from 'react'
import { Modal, ModalButton } from '@/components/ui/modal'
import { closuresContent } from '@/content/closures'
import { useApplyClosure, useClosureApplyPreview } from '@/features/closures/hooks/useClosures'
import type { Closure, ClosureApplyPreview, ClosureApplyResult, ClosurePreviewGroup } from '@/features/closures/types'
import { conflictLines } from '@/features/today/lib/carryover'
import { useTechniciansList } from '@/features/technicians/hooks/useTechnicians'
import { ApiError } from '@/lib/errors'
import { formatShortDate } from '@/lib/round-dates'
import { fillCopy } from '@/lib/utils'

const copy = closuresContent

export interface ApplyPreviewDialogProps {
  closure: Closure
  open: boolean
  onClose: () => void
}

function plural(count: number, many: string, one: string, values: Record<string, string | number> = {}): string {
  return fillCopy(count === 1 ? one : many, { count, ...values })
}

function groupLine(group: ClosurePreviewGroup): string {
  if (group.to === null) {
    return plural(group.count, copy.preview.groupSkip, copy.preview.groupSkipOne, { from: formatShortDate(group.from) })
  }
  return plural(group.count, copy.preview.group, copy.preview.groupOne, {
    from: formatShortDate(group.from),
    to: formatShortDate(group.to),
  })
}

function resultLines(result: ClosureApplyResult): string[] {
  const lines: string[] = []
  if (result.moved > 0) lines.push(plural(result.moved, copy.result.moved, copy.result.movedOne))
  if (result.skipped > 0) lines.push(plural(result.skipped, copy.result.skipped, copy.result.skippedOne))
  if (lines.length === 0) lines.push(copy.result.nothingChanged)
  if (result.notifiedTechnicians > 0) {
    lines.push(plural(result.notifiedTechnicians, copy.result.technicians, copy.result.techniciansOne))
  }
  if (result.notifiedCustomers > 0) {
    lines.push(plural(result.notifiedCustomers, copy.result.customers, copy.result.customersOne))
  }
  if (result.conflicts.length > 0) lines.push(plural(result.conflicts.length, copy.result.conflicts, copy.result.conflictsOne))
  return lines
}

function PreviewBody({ preview, notify, onNotify }: {
  preview: ClosureApplyPreview
  notify: boolean
  onNotify: (next: boolean) => void
}) {
  const hasConflicts = preview.conflicts.length > 0
  const technicians = useTechniciansList(hasConflicts)
  const names = new Map((technicians.data ?? []).map((technician) => [technician.id, technician.name ?? '']))
  const { totals } = preview
  const summary = preview.mode === 'SKIP' ? copy.preview.totals.skipSummary : copy.preview.totals.moveSummary

  if (totals.visits === 0) return <p className="text-sm text-foreground">{copy.preview.nothing}</p>

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-foreground">{copy.preview.totals.heading}</h3>
        <p className="mt-1 text-sm text-foreground">
          {fillCopy(summary, { visits: totals.visits, rounds: totals.rounds, customers: totals.customers })}
        </p>
        {totals.technicianConflicts > 0 ? (
          <p className="mt-1 text-sm font-medium text-warning-foreground">
            {plural(totals.technicianConflicts, copy.preview.totals.conflicts, copy.preview.totals.conflictsOne)}
          </p>
        ) : null}
      </div>

      <ul className="space-y-3">
        {preview.rounds.map((round) => (
          <li key={round.roundId}>
            <p className="text-sm font-semibold text-foreground">
              {plural(round.visitCount, copy.preview.roundHeading, copy.preview.roundHeadingOne, { name: round.roundName })}
            </p>
            <ul className="ml-4 list-disc text-sm text-foreground">
              {round.groups.map((group) => (
                <li key={`${group.from}-${group.to ?? 'skip'}`}>{groupLine(group)}</li>
              ))}
            </ul>
          </li>
        ))}
      </ul>

      {hasConflicts ? (
        <div className="rounded-lg border border-warning-border bg-warning-surface px-3 py-2 text-sm text-warning-foreground">
          <p className="font-semibold">{copy.preview.conflictsHeading}</p>
          <ul className="ml-4 list-disc">
            {conflictLines(preview.conflicts, names).map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <p className="mt-1 text-xs">{copy.preview.reassign}</p>
        </div>
      ) : null}

      <div>
        <label className="flex min-h-6 cursor-pointer items-center gap-2 text-sm font-medium text-foreground">
          <input
            type="checkbox"
            className="h-6 w-6 accent-primary"
            checked={notify}
            onChange={(event) => onNotify(event.target.checked)}
          />
          {copy.form.notify.label}
        </label>
        {notify ? (
          <div className="mt-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground">
            <p className="text-xs font-semibold">{copy.preview.customerMessageHeading}</p>
            <p className="mt-1 whitespace-pre-line">{preview.customerMessage}</p>
          </div>
        ) : (
          <p className="mt-1 text-xs text-muted">{copy.preview.customerMessageOff}</p>
        )}
      </div>
    </div>
  )
}

/**
 * "Apply to existing visits": runs the no-write preview when it opens, shows what would move or be
 * skipped, and applies once on Confirm. A failed customer message is a warning on a successful result.
 */
export function ApplyPreviewDialog({ closure, open, onClose }: ApplyPreviewDialogProps) {
  const previewMutation = useClosureApplyPreview()
  const applyMutation = useApplyClosure()
  const applying = useRef(false)
  const [notify, setNotify] = useState(closure.notifyCustomers)
  const [result, setResult] = useState<ClosureApplyResult | null>(null)
  const [applyError, setApplyError] = useState<{ message: string; ended: boolean } | null>(null)
  const { mutate: loadPreview } = previewMutation

  useEffect(() => {
    if (open) loadPreview(closure.id)
  }, [open, closure.id, loadPreview])

  async function handleConfirm() {
    if (applying.current) return
    applying.current = true
    setApplyError(null)
    try {
      setResult(await applyMutation.mutateAsync({ id: closure.id, input: { notifyCustomers: notify } }))
    } catch (caught) {
      const code = caught instanceof ApiError ? caught.code : undefined
      setApplyError({
        message: (code ? copy.errors[code] : undefined) ?? copy.preview.applyError,
        ended: code === 'CLOSURE_ENDED',
      })
    } finally {
      applying.current = false
    }
  }

  const preview = previewMutation.data
  const canApply = !result && preview !== undefined && preview.totals.visits > 0 && !applyError?.ended

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={fillCopy(copy.preview.title, { label: closure.label })}
      showCloseButton
      size="compact"
      maxWidthClass="max-w-xl"
      footer={
        result ? (
          <ModalButton compact variant="primary" className="w-full" onClick={onClose}>
            {copy.result.done}
          </ModalButton>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <ModalButton compact variant="secondary" className="w-full" onClick={onClose}>
              {copy.preview.cancel}
            </ModalButton>
            {canApply ? (
              <ModalButton
                compact
                variant="primary"
                className="w-full"
                loading={applyMutation.isPending}
                onClick={() => void handleConfirm()}
              >
                {applyMutation.isPending ? copy.preview.confirming : applyError ? copy.preview.retry : copy.preview.confirm}
              </ModalButton>
            ) : null}
          </div>
        )
      }
    >
      {result ? (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground">{copy.result.heading}</h3>
          <ul className="list-disc space-y-0.5 pl-5 text-sm text-foreground">
            {resultLines(result).map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          {result.customerNotificationError ? (
            <p role="status" className="rounded-lg border border-warning-border bg-warning-surface px-3 py-2 text-sm text-warning-foreground">
              {fillCopy(copy.result.customerError, { error: result.customerNotificationError })}
            </p>
          ) : null}
        </div>
      ) : previewMutation.isSuccess ? (
        <>
          <PreviewBody preview={previewMutation.data} notify={notify} onNotify={setNotify} />
          {applyError ? (
            <p role="alert" className="mt-3 text-sm text-danger">
              {applyError.message}
            </p>
          ) : null}
        </>
      ) : previewMutation.isError ? (
        <div role="alert" className="text-sm text-danger">
          <p>{copy.preview.error}</p>
          <button
            type="button"
            onClick={() => loadPreview(closure.id)}
            className="mt-1 min-h-6 font-semibold text-primary underline underline-offset-2"
          >
            {copy.preview.retry}
          </button>
        </div>
      ) : (
        <p role="status" className="text-sm text-muted">
          {copy.preview.loading}
        </p>
      )}
    </Modal>
  )
}
