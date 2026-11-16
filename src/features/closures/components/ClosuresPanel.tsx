import { useMemo, useState } from 'react'
import { DashboardIcon } from '@/components/dashboard/DashboardIcon'
import { dashboardCtaClass } from '@/components/dashboard/dashboard-styles'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Modal } from '@/components/ui/modal'
import { closuresContent } from '@/content/closures'
import { ApplyPreviewDialog } from '@/features/closures/components/ApplyPreviewDialog'
import { ClosureForm } from '@/features/closures/components/ClosureForm'
import { useClosures, useDeleteClosure } from '@/features/closures/hooks/useClosures'
import type { Closure } from '@/features/closures/types'
import { useRounds } from '@/features/rounds/hooks/useRounds'
import { useAppBootstrap } from '@/providers/AppBootstrapProvider'
import { isoDateInTenantZone } from '@/lib/timezone'
import { formatShortDate } from '@/lib/round-dates'
import { cn, fillCopy } from '@/lib/utils'

const copy = closuresContent
const rowButtonClass =
  'min-h-6 rounded-md px-2 py-1 text-sm font-semibold text-primary underline underline-offset-2 hover:bg-surface'

/** Edited after it was last applied: the existing visits no longer match it. */
function changedSinceApply(closure: Closure): boolean {
  return closure.appliedAt !== null && closure.updatedAt > closure.appliedAt
}

function datesText(closure: Closure): string {
  if (closure.startDate === closure.endDate) return fillCopy(copy.row.singleDay, { start: formatShortDate(closure.startDate, true) })
  return fillCopy(copy.row.dates, {
    start: formatShortDate(closure.startDate, true),
    end: formatShortDate(closure.endDate, true),
  })
}

function ClosureRow({
  closure,
  roundNames,
  onEdit,
  onDelete,
  onApply,
}: {
  closure: Closure
  roundNames: ReadonlyMap<string, string>
  onEdit: () => void
  onDelete: () => void
  onApply: () => void
}) {
  const edited = changedSinceApply(closure)
  const roundsText =
    closure.roundIds.length === 0
      ? copy.row.allRounds
      : fillCopy(copy.row.rounds, {
          names: closure.roundIds.map((id) => roundNames.get(id) ?? copy.row.unknownRound).join(', '),
        })
  return (
    <li className="rounded-xl border border-border px-4 py-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-foreground">
            {closure.label}
            <span className="rounded bg-accent-surface px-1.5 py-0.5 text-[11px] font-medium text-accent">
              {closure.mode === 'MOVE' ? copy.row.modeMove : copy.row.modeSkip}
            </span>
          </p>
          <p className="text-sm text-foreground">{datesText(closure)}</p>
          <p className="text-xs text-muted">{roundsText}</p>
          <p className="text-xs text-muted">
            {closure.appliedAt
              ? fillCopy(copy.row.applied, { date: formatShortDate(isoDateInTenantZone(new Date(closure.appliedAt)), true) })
              : copy.row.notApplied}
          </p>
          {edited ? <p className="text-xs font-medium text-warning-foreground">{copy.row.editedAfterApply}</p> : null}
        </div>
        <div className="flex flex-wrap gap-1">
          <button type="button" className={rowButtonClass} onClick={onEdit} aria-label={`${copy.row.edit} ${closure.label}`}>
            {copy.row.edit}
          </button>
          <button type="button" className={rowButtonClass} onClick={onApply} aria-label={`${edited ? copy.row.applyAgain : copy.row.apply} ${closure.label}`}>
            {edited ? copy.row.applyAgain : copy.row.apply}
          </button>
          <button type="button" className={cn(rowButtonClass, 'text-danger')} onClick={onDelete} aria-label={`${copy.row.delete} ${closure.label}`}>
            {copy.row.delete}
          </button>
        </div>
      </div>
    </li>
  )
}

function ClosuresPanelBody() {
  const query = useClosures()
  const roundsQuery = useRounds()
  const remove = useDeleteClosure()
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Closure | null>(null)
  const [deleting, setDeleting] = useState<Closure | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [applying, setApplying] = useState<Closure | null>(null)

  const rounds = useMemo(() => roundsQuery.data ?? [], [roundsQuery.data])
  const roundNames = useMemo(() => new Map(rounds.map((round) => [round.id, round.name])), [rounds])
  const roundOptions = useMemo(() => rounds.filter((round) => round.status !== 'ARCHIVED'), [rounds])
  const closures = useMemo(
    () => [...(query.data?.closures ?? [])].sort((a, b) => a.startDate.localeCompare(b.startDate)),
    [query.data],
  )

  async function confirmDelete(target: Closure) {
    setDeleteError(null)
    try {
      await remove.mutateAsync(target.id)
      setDeleting(null)
    } catch {
      setDeleteError(copy.delete.error)
    }
  }

  let content
  if (query.isPending) {
    content = (
      <p role="status" className="mt-5 text-sm text-muted">
        {copy.section.loading}
      </p>
    )
  } else if (query.isError) {
    content = (
      <div role="alert" className="mt-5 text-sm text-foreground">
        <p>{copy.section.loadError}</p>
        <button type="button" onClick={() => void query.refetch()} className="mt-3 min-h-6 font-semibold text-primary underline underline-offset-2">
          {copy.section.retry}
        </button>
      </div>
    )
  } else if (closures.length === 0) {
    content = <p className="mt-5 text-sm text-muted">{copy.section.empty}</p>
  } else {
    content = (
      <ul aria-label={copy.section.listLabel} className="mt-5 space-y-2">
        {closures.map((closure) => (
          <ClosureRow
            key={closure.id}
            closure={closure}
            roundNames={roundNames}
            onEdit={() => {
              setEditTarget(closure)
              setFormOpen(true)
            }}
            onDelete={() => {
              setDeleteError(null)
              setDeleting(closure)
            }}
            onApply={() => setApplying(closure)}
          />
        ))}
      </ul>
    )
  }

  return (
    <article className="rounded-lg border border-border bg-card p-6 shadow-sm">
      <div className="flex items-start gap-3 border-b border-border pb-5">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-surface text-accent">
          <DashboardIcon name="calendar" className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-foreground">{copy.section.title}</h2>
          <p className="mt-0.5 text-sm text-muted">{copy.section.intro}</p>
        </div>
        <button type="button" onClick={() => {
            setEditTarget(null)
            setFormOpen(true)
          }} className={cn(dashboardCtaClass, 'px-4 py-2 text-sm')}>
          {copy.section.add}
        </button>
      </div>

      {content}

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editTarget ? copy.form.titleEdit : copy.form.titleAdd}
        showCloseButton
        size="compact"
        maxWidthClass="max-w-xl"
      >
        <ClosureForm
          closure={editTarget ?? undefined}
          rounds={roundOptions}
          onSaved={() => setFormOpen(false)}
          onCancel={() => setFormOpen(false)}
        />
      </Modal>

      {deleting ? (
        <ConfirmDialog
          open
          title={copy.delete.title}
          description={fillCopy(copy.delete.body, { label: deleting.label })}
          confirmLabel={remove.isPending ? copy.delete.deleting : copy.delete.confirm}
          cancelLabel={copy.delete.cancel}
          pending={remove.isPending}
          error={deleteError}
          onConfirm={() => void confirmDelete(deleting)}
          onClose={() => setDeleting(null)}
        />
      ) : null}

      {applying ? <ApplyPreviewDialog key={applying.id} closure={applying} open onClose={() => setApplying(null)} /> : null}
    </article>
  )
}

/** Settings > Closures (ADMIN and MANAGER). Anyone else sees nothing and no request is made. */
export function ClosuresPanel() {
  const { role } = useAppBootstrap()
  if (role !== 'ADMIN' && role !== 'MANAGER') return null
  return <ClosuresPanelBody />
}
