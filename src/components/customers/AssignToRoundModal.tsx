import { useEffect, useMemo, useState } from 'react'
import type { CustomerPropertyRecord } from '@/content/customers'
import { customersContent } from '@/content/customers'
import { DashboardIcon } from '@/components/dashboard/DashboardIcon'
import { Field, Select } from '@/components/ui'
import { Modal, ModalButton, modalInputClass } from '@/components/ui/modal'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'

interface AssignToRoundModalProps {
  open: boolean
  record: CustomerPropertyRecord | null
  onClose: () => void
}

/** Assign an unassigned property to a round and technician — from Customers list. */
export function AssignToRoundModal({ open, record, onClose }: AssignToRoundModalProps) {
  const { assignToRoundModal } = customersContent
  const { showToast } = useToast()
  const [roundId, setRoundId] = useState('')
  const [technicianId, setTechnicianId] = useState('')

  const roundOptions = useMemo(
    () =>
      assignToRoundModal.rounds.map(({ value, label }) => ({
        value,
        label,
      })),
    [assignToRoundModal.rounds],
  )

  const selectedRound = assignToRoundModal.rounds.find((round) => round.value === roundId)

  useEffect(() => {
    if (!open) return
    setRoundId('')
    setTechnicianId('')
  }, [open, record?.id])

  useEffect(() => {
    if (!selectedRound || !('technicianId' in selectedRound)) return
    setTechnicianId(selectedRound.technicianId)
  }, [selectedRound])

  if (!record) return null

  const subtitle = assignToRoundModal.subtitle
    .replace('{customer}', record.customer)
    .replace('{address}', record.address)

  function handleConfirm() {
    if (!roundId || !technicianId) return
    onClose()
    showToast(assignToRoundModal.successToast)
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={assignToRoundModal.title}
      subtitle={subtitle}
      showCloseButton
      stacked
      size="compact"
      maxWidthClass="max-w-md"
      headerClassName="pl-16"
      bodyClassName="space-y-4"
      footer={
        <div className="grid grid-cols-2 gap-3">
          <ModalButton compact variant="secondary" className="w-full" onClick={onClose}>
            {assignToRoundModal.actions.cancel}
          </ModalButton>
          <ModalButton
            compact
            variant="primary"
            className="w-full"
            disabled={!roundId || !technicianId}
            onClick={handleConfirm}
          >
            {assignToRoundModal.actions.confirm}
          </ModalButton>
        </div>
      }
    >
      <span className="absolute top-4 left-5 flex h-9 w-9 items-center justify-center rounded-none bg-accent-surface text-accent">
        <DashboardIcon name="home" className="h-5 w-5" />
      </span>

      <Field label={assignToRoundModal.fields.round} size="sm" labelWeight="medium">
        <Select
          inputSize="sm"
          value={roundId}
          onChange={(event) => setRoundId(event.target.value)}
          options={roundOptions}
          className={cn(modalInputClass, 'border-accent/25 bg-accent-surface')}
        />
      </Field>

      <Field label={assignToRoundModal.fields.technician} size="sm" labelWeight="medium">
        <Select
          inputSize="sm"
          value={technicianId}
          onChange={(event) => setTechnicianId(event.target.value)}
          options={[...assignToRoundModal.technicianOptions]}
          className={cn(modalInputClass, 'border-accent/25 bg-accent-surface')}
        />
        <p className="mt-2 text-xs text-muted">{assignToRoundModal.fields.technicianHint}</p>
      </Field>
    </Modal>
  )
}
