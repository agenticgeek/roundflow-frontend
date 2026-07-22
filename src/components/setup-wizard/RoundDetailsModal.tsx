import { useEffect, useMemo, useState } from 'react'
import type { Technician, WizardRound } from '@/types/setup-wizard'
import type { SelectOption } from '@/content/setup-wizard'
import { setupWizardContent } from '@/content/setup-wizard'
import { formatRoundName } from '@/lib/setup-wizard-options'
import { Modal, ModalButton } from '@/components/ui/modal'
import { SelectCardList } from '@/components/setup-wizard/SelectCardList'

const UNASSIGNED_VALUE = ''

export interface RoundDetailsModalProps {
  open: boolean
  onClose: () => void
  round: WizardRound | null
  technicians: Technician[]
  roundDays: readonly SelectOption[]
  onSave: (roundId: string, technicianId: string) => void
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-medium tracking-wide text-muted uppercase">{label}</p>
      <p className="mt-1 text-sm font-semibold text-foreground">{value}</p>
    </div>
  )
}

export function RoundDetailsModal({
  open,
  onClose,
  round,
  technicians,
  roundDays,
  onSave,
}: RoundDetailsModalProps) {
  const { modal, actions } = setupWizardContent.assignTechnicians
  const { labels, actions: modalActions } = modal

  const [technicianId, setTechnicianId] = useState('')

  const dayLabels = useMemo(
    () => Object.fromEntries(roundDays.filter((day) => day.value).map((day) => [day.value, day.label])),
    [roundDays],
  )

  const technicianOptions = useMemo(
    () => [
      { value: UNASSIGNED_VALUE, label: actions.unassigned },
      ...technicians.map((technician) => ({
        value: technician.id,
        label: technician.fullName,
      })),
    ],
    [actions.unassigned, technicians],
  )

  useEffect(() => {
    if (!open || !round) return
    setTechnicianId(round.technicianId)
  }, [open, round])

  function handleSave() {
    if (!round) return
    onSave(round.id, technicianId)
    onClose()
  }

  if (!round) return null

  const roundName = round.name ?? formatRoundName(round.areaName, round.day, roundDays)

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="compact"
      showCloseButton
      maxWidthClass="max-w-md sm:max-w-lg"
      title={modal.title}
      footer={
        <ModalButton compact variant="primary" className="w-full" onClick={handleSave}>
          {modalActions.save}
        </ModalButton>
      }
    >
      <div className="space-y-4">
        <DetailField label={labels.roundName} value={roundName} />

        <div className="grid gap-4 sm:grid-cols-2">
          <DetailField label={labels.area} value={round.areaName} />
          <DetailField label={labels.day} value={dayLabels[round.day] ?? round.day} />
        </div>

        <DetailField
          label={labels.properties}
          value={`${round.propertyCount} ${labels.propertiesSuffix}`}
        />

        <div className="border-t border-border pt-4">
          <p className="text-[11px] font-medium tracking-wide text-muted uppercase">
            {labels.assignTechnician}
          </p>
          <div className="mt-3">
            <SelectCardList
              options={technicianOptions}
              value={technicianId}
              onChange={setTechnicianId}
              ariaLabel={labels.assignTechnician}
            />
          </div>
        </div>
      </div>
    </Modal>
  )
}
