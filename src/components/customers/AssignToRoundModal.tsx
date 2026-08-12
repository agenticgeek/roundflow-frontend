import { useEffect, useMemo, useState } from 'react'
import type { CustomerPropertyRecord } from '@/content/customers'
import { customersContent } from '@/content/customers'
import { DashboardIcon } from '@/components/dashboard/DashboardIcon'
import { Field, Select } from '@/components/ui'
import { Modal, ModalButton, modalInputClass } from '@/components/ui/modal'
import { useToast } from '@/components/ui/toast'
import { useUpdateProperty } from '@/features/properties/hooks/useProperties'
import { useRound, useRounds } from '@/features/rounds/hooks/useRounds'
import { useAppBootstrap } from '@/providers/AppBootstrapProvider'
import { ApiError } from '@/lib/errors'
import { cn } from '@/lib/utils'

interface AssignToRoundModalProps {
  open: boolean
  record: CustomerPropertyRecord | null
  onClose: () => void
}

/** Assign an unassigned property to a round — PATCH /properties/:id { roundId }. */
export function AssignToRoundModal({ open, record, onClose }: AssignToRoundModalProps) {
  const { assignToRoundModal } = customersContent
  const { showToast } = useToast()
  const { canMutate } = useAppBootstrap()
  const updateProperty = useUpdateProperty()
  const roundsQuery = useRounds('ACTIVE', open)
  const [roundId, setRoundId] = useState('')

  const roundOptions = useMemo(() => {
    const rounds = (roundsQuery.data ?? []).map((round) => ({
      value: round.id,
      label: round.name,
    }))
    return [{ value: '', label: assignToRoundModal.fields.roundPlaceholder }, ...rounds]
  }, [assignToRoundModal.fields.roundPlaceholder, roundsQuery.data])

  const roundDetailQuery = useRound(roundId, open && Boolean(roundId))
  const technicianLabel =
    roundDetailQuery.data?.technicians
      ?.filter((tech) => tech.active)
      .map((tech) => tech.name)
      .join(', ') || '—'

  useEffect(() => {
    if (!open) return
    setRoundId('')
  }, [open, record?.id])

  if (!record) return null

  const subtitle = assignToRoundModal.subtitle
    .replace('{customer}', record.customer)
    .replace('{address}', record.address)

  async function handleConfirm() {
    if (!roundId || !canMutate || !record?.propertyId || updateProperty.isPending) return
    try {
      await updateProperty.mutateAsync({
        id: record.propertyId,
        input: { roundId },
      })
      onClose()
      showToast(assignToRoundModal.successToast)
    } catch (error) {
      if (error instanceof ApiError && error.status === 400) return
      showToast(error instanceof Error ? error.message : 'Could not assign property')
    }
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
            disabled={!roundId || !canMutate || updateProperty.isPending}
            onClick={() => void handleConfirm()}
          >
            {assignToRoundModal.actions.confirm}
          </ModalButton>
        </div>
      }
    >
      <span className="absolute top-4 left-5 flex h-9 w-9 items-center justify-center rounded-none bg-accent-surface text-accent">
        <DashboardIcon name="home" className="h-5 w-5" />
      </span>

      {!canMutate ? (
        <p className="rounded-lg border border-warning-border bg-warning-surface px-3 py-2 text-sm text-warning-foreground">
          You don&apos;t have permission to assign properties.
        </p>
      ) : null}

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
        <p className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground">
          {roundDetailQuery.isPending && roundId ? 'Loading…' : technicianLabel}
        </p>
        <p className="mt-2 text-xs text-muted">{assignToRoundModal.fields.technicianHint}</p>
      </Field>
    </Modal>
  )
}
