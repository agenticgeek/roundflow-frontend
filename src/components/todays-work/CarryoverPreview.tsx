import { Link } from 'react-router-dom'
import type { UseQueryResult } from '@tanstack/react-query'
import type { CarryoverResult } from '@/api/carryover.api'
import { ROUTES } from '@/config/routes'
import { carryoverContent } from '@/content/carryover'
import { conflictLines, movedText } from '@/features/today/lib/carryover'
import { useTechniciansList } from '@/features/technicians/hooks/useTechnicians'

const copy = carryoverContent

/** Dry-run of the carryover: how many jobs move and which technicians cannot work that day. */
export function CarryoverPreview({ preview }: { preview: UseQueryResult<CarryoverResult> }) {
  const technicians = useTechniciansList()
  const names = new Map((technicians.data ?? []).map((technician) => [technician.id, technician.name ?? '']))
  const data = preview.data
  const lines = data ? conflictLines(data.conflicts, names) : []
  return (
    <section aria-labelledby="carryover-preview-heading" className="space-y-2 rounded-none border border-border bg-card px-4 py-3">
      <h3 id="carryover-preview-heading" className="text-sm font-semibold text-foreground">
        {copy.preview.heading}
      </h3>
      {preview.isPending ? <p className="text-sm text-muted">{copy.preview.loading}</p> : null}
      {preview.isError ? (
        <p role="alert" className="text-sm text-danger">
          {copy.preview.error}
        </p>
      ) : null}
      {data ? (
        <>
          <p className="text-sm text-foreground">{movedText(data.moved, data.targetDate, 'preview')}</p>
          {lines.length > 0 ? (
            <div className="rounded-none border border-warning-border bg-warning-surface px-3 py-2 text-sm text-warning-foreground">
              <p className="font-semibold">{copy.preview.conflictsHeading}</p>
              <ul className="mt-1 list-disc pl-5">
                {lines.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
              <Link to={ROUTES.roundPlanner} className="mt-1 inline-block min-h-6 font-semibold underline underline-offset-2">
                {copy.preview.reassign}
              </Link>
            </div>
          ) : null}
          {data.skipped.length > 0 ? (
            <p className="text-sm text-muted">{copy.preview.skipped.replace('{count}', String(data.skipped.length))}</p>
          ) : null}
        </>
      ) : null}
    </section>
  )
}

/** Shown after the day closes: what moved and who was told. `role="status"` so it is announced. */
export function CarryoverResultPanel({
  moved,
  date,
  notifiedCustomers,
  customerError,
}: {
  moved: number
  date: string
  notifiedCustomers?: number
  customerError?: string
}) {
  const result = copy.result
  return (
    <div role="status" className="space-y-1 rounded-none border border-success/30 bg-success/5 px-4 py-3 text-sm text-foreground">
      <p className="font-semibold">{result.heading}</p>
      <p>{movedText(moved, date, 'result')}</p>
      {notifiedCustomers ? <p>{result.customers.replace('{count}', String(notifiedCustomers))}</p> : null}
      {customerError ? <p className="text-danger">{result.customerError.replace('{error}', customerError)}</p> : null}
    </div>
  )
}
