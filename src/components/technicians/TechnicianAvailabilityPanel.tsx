import { useState } from 'react'
import { Field, Input } from '@/components/ui'
import { ModalButton } from '@/components/ui/modal'
import { useToast } from '@/components/ui/toast'
import { ReplaceTechnicianModal } from '@/components/technicians/ReplaceTechnicianModal'
import { technicianRecordsContent } from '@/content/technician-records'
import {
  useAddAvailability,
  useRemoveAvailability,
  useTechnicianAvailability,
} from '@/features/technicians/hooks/useTechnicianRecords'
import { formatAvailabilityRange } from '@/features/technicians/lib/records'
import { errorMessage } from '@/lib/errors'

/** Technician detail › Availability: time-off windows, add / remove, and "Replace technician" (GAP-030). */
export function TechnicianAvailabilityPanel({
  technicianId,
  technicianName,
  canMutate,
}: {
  technicianId: string
  technicianName: string
  canMutate: boolean
}) {
  const copy = technicianRecordsContent.availability
  const { showToast } = useToast()
  const query = useTechnicianAvailability(technicianId)
  const add = useAddAvailability(technicianId)
  const remove = useRemoveAvailability(technicianId)
  const [adding, setAdding] = useState(false)
  const [replacing, setReplacing] = useState(false)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)

  function closeForm() {
    setAdding(false)
    setFrom('')
    setTo('')
    setReason('')
    setError(null)
  }

  async function save() {
    if (!from || !to) {
      setError(copy.datesRequired)
      return
    }
    setError(null)
    try {
      const created = await add.mutateAsync({ from, to, reason: reason.trim() || null })
      showToast(copy.added.replace('{count}', String(created.visitsRestamped)))
      closeForm()
    } catch (caught) {
      setError(errorMessage(caught))
    }
  }

  async function removeWindow(id: string) {
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
          <div className="flex gap-3 text-sm font-semibold">
            {!adding ? (
              <button type="button" onClick={() => setAdding(true)} className="text-primary underline">
                {copy.add}
              </button>
            ) : null}
            <button type="button" onClick={() => setReplacing(true)} className="text-primary underline">
              {copy.replace}
            </button>
          </div>
        ) : null}
      </div>

      <div className="mt-4 space-y-3">
        {query.isPending ? (
          <p className="text-sm text-muted">{copy.loading}</p>
        ) : query.isError ? (
          <p role="alert" className="text-sm text-danger">
            {errorMessage(query.error)}
          </p>
        ) : query.data.length === 0 ? (
          <p className="text-sm text-muted">{copy.empty}</p>
        ) : (
          <ul className="space-y-2">
            {query.data.map((window) => {
              const range = formatAvailabilityRange(window)
              return (
                <li key={window.id} className="flex items-center justify-between gap-3 text-sm">
                  <span>
                    <span className="font-medium text-foreground">{range}</span>
                    {window.reason ? <span className="text-muted"> · {window.reason}</span> : null}
                  </span>
                  {canMutate ? (
                    <button
                      type="button"
                      aria-label={copy.removeLabel.replace('{range}', range)}
                      disabled={remove.isPending}
                      onClick={() => void removeWindow(window.id)}
                      className="text-xs font-semibold text-danger disabled:opacity-50"
                    >
                      {copy.remove}
                    </button>
                  ) : null}
                </li>
              )
            })}
          </ul>
        )}

        {adding ? (
          <div className="space-y-3 rounded-lg border border-border bg-surface p-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label={copy.fromLabel} size="sm" labelWeight="medium">
                <Input
                  inputSize="sm"
                  type="date"
                  aria-label={copy.fromLabel}
                  value={from}
                  onChange={(event) => setFrom(event.target.value)}
                />
              </Field>
              <Field label={copy.toLabel} size="sm" labelWeight="medium">
                <Input
                  inputSize="sm"
                  type="date"
                  aria-label={copy.toLabel}
                  value={to}
                  min={from}
                  onChange={(event) => setTo(event.target.value)}
                />
              </Field>
            </div>
            <Field label={copy.reasonLabel} size="sm" labelWeight="medium">
              <Input
                inputSize="sm"
                aria-label={copy.reasonLabel}
                placeholder={copy.reasonPlaceholder}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
              />
            </Field>
            {error ? (
              <p role="alert" className="text-sm text-danger">
                {error}
              </p>
            ) : null}
            <div className="flex justify-end gap-2">
              <ModalButton compact onClick={closeForm} disabled={add.isPending}>
                {copy.cancel}
              </ModalButton>
              <ModalButton compact variant="primary" loading={add.isPending} onClick={() => void save()}>
                {add.isPending ? copy.saving : copy.save}
              </ModalButton>
            </div>
          </div>
        ) : null}
      </div>

      {replacing ? (
        <ReplaceTechnicianModal
          technicianId={technicianId}
          technicianName={technicianName}
          onClose={() => setReplacing(false)}
        />
      ) : null}
    </section>
  )
}
