import { useEffect, useState } from 'react'
import { roundPlannerContent } from '@/content/round-planner'
import { Field, Input } from '@/components/ui'
import { Modal, ModalButton } from '@/components/ui/modal'
import { useToast } from '@/components/ui/toast'
import { useRescheduleVisit } from '@/features/visits/hooks/useVisits'
import { todayIsoDate } from '@/features/rounds/lib/planner'

interface RescheduleVisitModalProps {
  open: boolean
  visit: { visitId: string; addressLine: string } | null
  onClose: () => void
}

/** Books one skipped or scheduled visit (e.g. after a manual weather hold) onto a new date. */
export function RescheduleVisitModal({ open, visit, onClose }: RescheduleVisitModalProps) {
  const { rescheduleModal } = roundPlannerContent
  const { showToast } = useToast()
  const reschedule = useRescheduleVisit()
  const [date, setDate] = useState('')

  useEffect(() => {
    if (open) setDate('')
  }, [open])

  if (!visit) return null

  async function handleSave() {
    if (!visit || reschedule.isPending) return
    if (!date || date < todayIsoDate()) {
      showToast(rescheduleModal.pastDate)
      return
    }
    try {
      await reschedule.mutateAsync({ visitId: visit.visitId, date })
      showToast(rescheduleModal.toast)
      onClose()
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Could not reschedule the visit.')
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={rescheduleModal.title}
      subtitle={rescheduleModal.subtitle.replace('{address}', visit.addressLine)}
      showCloseButton
      size="compact"
      maxWidthClass="max-w-sm"
      footer={
        <div className="grid grid-cols-2 gap-3">
          <ModalButton compact variant="secondary" className="w-full" onClick={onClose}>
            {rescheduleModal.cancel}
          </ModalButton>
          <ModalButton
            compact
            variant="primary"
            className="w-full"
            disabled={reschedule.isPending}
            onClick={() => void handleSave()}
          >
            {reschedule.isPending ? rescheduleModal.saving : rescheduleModal.save}
          </ModalButton>
        </div>
      }
    >
      <Field label={rescheduleModal.dateLabel} labelWeight="medium" size="sm">
        <Input
          inputSize="sm"
          type="date"
          min={todayIsoDate()}
          value={date}
          onChange={(event) => setDate(event.target.value)}
        />
      </Field>
      <p className="mt-1.5 text-[11px] text-muted">{rescheduleModal.hint}</p>
    </Modal>
  )
}
