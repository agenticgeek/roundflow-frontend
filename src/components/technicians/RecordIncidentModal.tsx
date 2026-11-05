import { useState } from 'react'
import type { IncidentType } from '@/api/technician-records.api'
import { Field, Input, Select, Textarea } from '@/components/ui'
import { Modal, ModalButton, ModalFooter } from '@/components/ui/modal'
import { useToast } from '@/components/ui/toast'
import { technicianRecordsContent } from '@/content/technician-records'
import { useRecordIncident } from '@/features/technicians/hooks/useTechnicianRecords'
import { errorMessage } from '@/lib/errors'

const TYPES: IncidentType[] = ['STRIKE', 'DAMAGE', 'UPSELL']

/** "Record incident" — strike, damage or upsell (GAP-025, POST /technicians/:id/incidents). */
export function RecordIncidentModal({ technicianId, onClose }: { technicianId: string; onClose: () => void }) {
  const copy = technicianRecordsContent.recordModal
  const types = technicianRecordsContent.incidents.types
  const { showToast } = useToast()
  const record = useRecordIncident(technicianId)
  const [type, setType] = useState<IncidentType>('STRIKE')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [visitId, setVisitId] = useState('')
  const [error, setError] = useState<string | null>(null)

  const parsedAmount = amount.trim() ? Number(amount) : null
  const amountError = parsedAmount !== null && !(parsedAmount > 0) ? copy.amountInvalid : null
  const noteMissing = !note.trim()

  async function submit() {
    setError(null)
    try {
      await record.mutateAsync({ type, note: note.trim(), amount: parsedAmount, visitId: visitId.trim() || null })
      showToast(copy.done.replace('{type}', types[type]))
      onClose()
    } catch (caught) {
      setError(errorMessage(caught))
    }
  }

  return (
    <Modal
      open
      onClose={record.isPending ? () => undefined : onClose}
      title={copy.title}
      subtitle={copy.subtitle}
      size="compact"
      bodyClassName="space-y-4"
      footer={
        <ModalFooter compact>
          <ModalButton compact onClick={onClose} disabled={record.isPending}>
            {copy.cancel}
          </ModalButton>
          <ModalButton
            compact
            variant="primary"
            loading={record.isPending}
            disabled={noteMissing || Boolean(amountError)}
            onClick={() => void submit()}
          >
            {record.isPending ? copy.saving : copy.save}
          </ModalButton>
        </ModalFooter>
      }
    >
      <Field label={copy.typeLabel} size="sm" labelWeight="medium">
        <Select
          inputSize="sm"
          aria-label={copy.typeLabel}
          value={type}
          onChange={(event) => setType(event.target.value as IncidentType)}
          options={TYPES.map((value) => ({ value, label: types[value] }))}
        />
      </Field>
      <Field label={copy.amountLabel} size="sm" labelWeight="medium" error={amountError}>
        <Input
          inputSize="sm"
          type="number"
          step="0.01"
          min="0"
          aria-label={copy.amountLabel}
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
        />
        <p className="mt-1 text-xs text-muted">{copy.amountHint}</p>
      </Field>
      <Field label={copy.noteLabel} size="sm" labelWeight="medium" required>
        <Textarea
          inputSize="sm"
          aria-label={copy.noteLabel}
          placeholder={copy.notePlaceholder}
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
      </Field>
      <Field label={copy.visitLabel} size="sm" labelWeight="medium">
        <Input
          inputSize="sm"
          aria-label={copy.visitLabel}
          placeholder={copy.visitPlaceholder}
          value={visitId}
          onChange={(event) => setVisitId(event.target.value)}
        />
      </Field>
      {error ? (
        <p role="alert" className="text-sm font-semibold text-danger">
          {error}
        </p>
      ) : null}
    </Modal>
  )
}
