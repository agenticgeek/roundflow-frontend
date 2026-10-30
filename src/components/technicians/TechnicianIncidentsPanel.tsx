import { useState } from 'react'
import { useToast } from '@/components/ui/toast'
import { RecordIncidentModal } from '@/components/technicians/RecordIncidentModal'
import { technicianRecordsContent } from '@/content/technician-records'
import { formatInvoiceDate } from '@/features/invoices/lib/mappers'
import { useDeleteIncident, useTechnicianIncidents } from '@/features/technicians/hooks/useTechnicianRecords'
import { errorMessage } from '@/lib/errors'
import { formatCurrency } from '@/lib/utils'

/** Technician detail › Incidents: list, delete and "Record incident" (GAP-025). */
export function TechnicianIncidentsPanel({ technicianId, canMutate }: { technicianId: string; canMutate: boolean }) {
  const copy = technicianRecordsContent.incidents
  const { showToast } = useToast()
  const query = useTechnicianIncidents(technicianId)
  const remove = useDeleteIncident(technicianId)
  const [recording, setRecording] = useState(false)

  async function removeIncident(id: string) {
    try {
      await remove.mutateAsync(id)
      showToast(copy.removed)
    } catch (caught) {
      showToast(errorMessage(caught), { tone: 'error' })
    }
  }

  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-foreground">{copy.title}</h2>
        {canMutate ? (
          <button type="button" onClick={() => setRecording(true)} className="text-sm font-semibold text-primary underline">
            {copy.record}
          </button>
        ) : null}
      </div>
      <div className="mt-4">
        {query.isPending ? (
          <p className="text-sm text-muted">{copy.loading}</p>
        ) : query.isError ? (
          <p role="alert" className="text-sm text-danger">
            {errorMessage(query.error)}
          </p>
        ) : query.data.rows.length === 0 ? (
          <p className="text-sm text-muted">{copy.empty}</p>
        ) : (
          <ul className="space-y-2">
            {query.data.rows.map((incident) => (
              <li key={incident.id} className="flex items-start justify-between gap-3 text-sm">
                <span className="min-w-0">
                  <span className="font-semibold text-foreground">{copy.types[incident.type]}</span>
                  <span className="text-muted"> · {formatInvoiceDate(incident.createdAt)}</span>
                  {incident.amount !== null ? (
                    <span className="text-muted"> · {formatCurrency(incident.amount)}</span>
                  ) : null}
                  {incident.note ? <span className="block text-muted">{incident.note}</span> : null}
                </span>
                {canMutate ? (
                  <button
                    type="button"
                    aria-label={copy.removeLabel.replace('{note}', incident.note ?? copy.types[incident.type])}
                    disabled={remove.isPending}
                    onClick={() => void removeIncident(incident.id)}
                    className="text-xs font-semibold text-danger disabled:opacity-50"
                  >
                    {copy.remove}
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
      {recording ? <RecordIncidentModal technicianId={technicianId} onClose={() => setRecording(false)} /> : null}
    </section>
  )
}
