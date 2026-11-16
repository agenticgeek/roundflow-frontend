import { useEffect, useState } from 'react'
import { roundPlannerContent } from '@/content/round-planner'
import { Field, Input } from '@/components/ui'
import { Modal, ModalButton } from '@/components/ui/modal'
import { useToast } from '@/components/ui/toast'
import { ClosureWarning } from '@/features/closures/components/ClosureWarning' // business closures
import { closureForDate } from '@/features/closures/lib/closure-days'
import { useClosures } from '@/features/closures/hooks/useClosures'
import type { ClosureWarning as ClosureWarningData } from '@/features/closures/types'
import { closuresContent } from '@/content/closures'
import { useRescheduleVisit } from '@/features/visits/hooks/useVisits'
import { todayIsoDate } from '@/features/rounds/lib/planner'

interface RescheduleVisitModalProps {
  open: boolean
  /** `roundId`, when known, lets a round-scoped closure warn only for its own rounds. */
  visit: { visitId: string; addressLine: string; roundId?: string } | null
  onClose: () => void
}

/** Books one skipped or scheduled visit (e.g. after a manual weather hold) onto a new date. */
export function RescheduleVisitModal({ open, visit, onClose }: RescheduleVisitModalProps) {
  const { rescheduleModal } = roundPlannerContent
  const { showToast } = useToast()
  const reschedule = useRescheduleVisit()
  const [date, setDate] = useState('')
  // Closures: warn (never block) when the picked date, or the saved result, falls inside one.
  const closures = useClosures(undefined, open)
  const [savedWarnings, setSavedWarnings] = useState<readonly ClosureWarningData[]>([])

  useEffect(() => {
    if (open) {
      setDate('')
      setSavedWarnings([])
    }
  }, [open])

  if (!visit) return null

  async function handleSave() {
    if (!visit || reschedule.isPending) return
    if (!date || date < todayIsoDate()) {
      showToast(rescheduleModal.pastDate)
      return
    }
    try {
      const result = await reschedule.mutateAsync({ visitId: visit.visitId, date })
      showToast(rescheduleModal.toast)
      const warnings = (result as { warnings?: ClosureWarningData[] }).warnings ?? []
      if (warnings.length > 0) setSavedWarnings(warnings)
      else onClose()
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
        savedWarnings.length > 0 ? (
          <ModalButton compact variant="primary" className="w-full" onClick={onClose}>
            {closuresContent.result.done}
          </ModalButton>
        ) : (
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
        )
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
      <ClosureWarning
        warnings={savedWarnings}
        closure={closureForDate(date, closures.data?.closures ?? [], visit.roundId ?? '')}
      />
    </Modal>
  )
}
