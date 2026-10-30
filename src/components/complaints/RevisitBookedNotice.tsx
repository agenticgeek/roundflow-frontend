import { Link } from 'react-router-dom'
import { ROUTES } from '@/config/routes'
import { complaintsContent } from '@/content/complaints'

/** After "Schedule revisit": the free revisit visit was created — link to the planner (GAP-029). */
export function RevisitBookedNotice({ visitId, onDismiss }: { visitId: string | null; onDismiss: () => void }) {
  const copy = complaintsContent.revisitBooked
  return (
    <div role="status" className="mb-4 rounded-lg border border-success/30 bg-success/5 px-4 py-3 text-sm">
      <div className="flex items-start justify-between gap-3">
        <p className="font-semibold text-foreground">{copy.title}</p>
        <button type="button" onClick={onDismiss} aria-label="Dismiss" className="text-xs text-muted">
          ×
        </button>
      </div>
      {visitId ? (
        <p className="mt-1 text-muted">
          {copy.body}{' '}
          <Link to={ROUTES.roundPlanner} className="font-semibold text-primary underline underline-offset-2">
            {copy.link}
          </Link>
        </p>
      ) : (
        <p className="mt-1 text-muted">{copy.noProperty}</p>
      )}
    </div>
  )
}
