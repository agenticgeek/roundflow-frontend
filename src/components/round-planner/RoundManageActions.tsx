import { useState } from 'react'
import { DashboardIcon } from '@/components/dashboard/DashboardIcon'
import { DeleteRoundDialog } from '@/components/round-planner/DeleteRoundDialog'
import { EditRoundModal } from '@/components/round-planner/EditRoundModal'
import { roundManageContent } from '@/content/round-planner'
import { cn, fillCopy } from '@/lib/utils'

interface RoundManageActionsProps {
  /** The round picked in the planner's round filter. */
  round: { id: string; name: string }
  /** The round was deleted (or was already gone) — show all rounds again. */
  onDeleted: () => void
}

const actionClass =
  'inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors'

/** Edit / Delete for the selected round. Render only for users who can make changes. */
export function RoundManageActions({ round, onDeleted }: RoundManageActionsProps) {
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)

  return (
    <div
      role="group"
      aria-label={fillCopy(roundManageContent.actionsLabel, { name: round.name })}
      className="flex flex-wrap items-center justify-end gap-2"
    >
      <button
        type="button"
        onClick={() => setEditing(true)}
        className={cn(actionClass, 'border-border bg-card text-foreground hover:bg-surface')}
      >
        <DashboardIcon name="edit" className="h-3.5 w-3.5" />
        {roundManageContent.edit}
      </button>
      <button
        type="button"
        onClick={() => setDeleting(true)}
        className={cn(actionClass, 'border-danger/30 bg-card text-danger hover:bg-danger/5')}
      >
        <DashboardIcon name="trash" className="h-3.5 w-3.5" />
        {roundManageContent.delete}
      </button>

      <EditRoundModal roundId={editing ? round.id : null} onClose={() => setEditing(false)} />
      <DeleteRoundDialog round={deleting ? round : null} onClose={() => setDeleting(false)} onDeleted={onDeleted} />
    </div>
  )
}
