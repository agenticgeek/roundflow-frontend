import { useState } from 'react'
import { Field, Input, Select } from '@/components/ui'
import { Modal, ModalButton, ModalFooter, ModalToggleRow } from '@/components/ui/modal'
import { useToast } from '@/components/ui/toast'
import { technicianRecordsContent } from '@/content/technician-records'
import { useTechniciansList } from '@/features/technicians/hooks/useTechnicians'
import { useReplaceTechnician } from '@/features/technicians/hooks/useTechnicianRecords'
import { replacementOptions } from '@/features/technicians/lib/records'
import { errorMessage } from '@/lib/errors'
import { todayIso } from '@/lib/round-dates'

/** "Replace technician": hand the scheduled visits in a date range to someone else (GAP-030). */
export function ReplaceTechnicianModal({
  technicianId,
  technicianName,
  onClose,
}: {
  technicianId: string
  technicianName: string
  onClose: () => void
}) {
  const copy = technicianRecordsContent.replaceModal
  const { showToast } = useToast()
  const techniciansQuery = useTechniciansList()
  const replace = useReplaceTechnician(technicianId)
  const options = replacementOptions(techniciansQuery.data, technicianId)
  const [replacementId, setReplacementId] = useState('')
  const [from, setFrom] = useState(todayIso())
  const [to, setTo] = useState('')
  const [notify, setNotify] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    setError(null)
    try {
      const result = await replace.mutateAsync({ replacementTechnicianId: replacementId, from, to: to || null, notify })
      showToast(copy.done.replace('{count}', String(result.visitsReassigned)))
      onClose()
    } catch (caught) {
      setError(errorMessage(caught))
    }
  }

  return (
    <Modal
      open
      onClose={replace.isPending ? () => undefined : onClose}
      title={copy.title}
      subtitle={copy.subtitle.replaceAll('{name}', technicianName)}
      size="compact"
      bodyClassName="space-y-4"
      footer={
        <ModalFooter compact>
          <ModalButton compact onClick={onClose} disabled={replace.isPending}>
            {copy.cancel}
          </ModalButton>
          <ModalButton
            compact
            variant="primary"
            loading={replace.isPending}
            disabled={!replacementId || !from}
            onClick={() => void submit()}
          >
            {replace.isPending ? copy.saving : copy.save}
          </ModalButton>
        </ModalFooter>
      }
    >
      <Field label={copy.replacementLabel} size="sm" labelWeight="medium">
        {techniciansQuery.isSuccess && options.length === 0 ? (
          <p className="text-sm text-muted">{copy.noReplacements}</p>
        ) : (
          <Select
            inputSize="sm"
            aria-label={copy.replacementLabel}
            value={replacementId}
            onChange={(event) => setReplacementId(event.target.value)}
            options={[{ value: '', label: copy.replacementPlaceholder }, ...options]}
          />
        )}
      </Field>
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
          <p className="mt-1 text-xs text-muted">{copy.toHint}</p>
        </Field>
      </div>
      <ModalToggleRow
        compact
        label={copy.notifyLabel}
        description={copy.notifyDescription}
        checked={notify}
        onChange={setNotify}
        ariaLabel={copy.notifyLabel}
      />
      {error ? (
        <p role="alert" className="text-sm font-semibold text-danger">
          {error}
        </p>
      ) : null}
    </Modal>
  )
}
