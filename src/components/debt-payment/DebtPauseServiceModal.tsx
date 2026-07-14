import { useEffect, useState } from 'react'
import type { DebtCustomerRecord } from '@/content/debt-payment'
import { debtPaymentContent } from '@/content/debt-payment'
import { DashboardIcon } from '@/components/dashboard/DashboardIcon'
import { Field, Input, Select, Textarea } from '@/components/ui'
import {
  Modal,
  ModalButton,
  modalInputClass,
  modalWarningPanelClass,
} from '@/components/ui/modal'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'

interface DebtPauseServiceModalProps {
  open: boolean
  record: DebtCustomerRecord | null
  onClose: () => void
}

function firstName(fullName: string) {
  return fullName.trim().split(/\s+/)[0] ?? fullName
}

/** Pause service for a debt-risk customer. */
export function DebtPauseServiceModal({ open, record, onClose }: DebtPauseServiceModalProps) {
  const { pauseModal } = debtPaymentContent
  const { showToast } = useToast()
  const [reason, setReason] = useState<string>(pauseModal.reasons[0]?.value ?? '')
  const [pauseFrom, setPauseFrom] = useState<string>(pauseModal.defaultPauseFrom)
  const [notifySms, setNotifySms] = useState(true)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!open || !record) return
    setReason(pauseModal.reasons[0]?.value ?? '')
    setPauseFrom(pauseModal.defaultPauseFrom)
    setNotifySms(true)
    setMessage(
      pauseModal.defaultMessage.replace('{firstName}', firstName(record.customer)),
    )
  }, [open, pauseModal, record])

  if (!record) return null

  const customerName = record.customer

  function handlePause() {
    onClose()
    showToast(pauseModal.successToast.replace('{customer}', customerName))
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={pauseModal.title}
      showCloseButton
      stacked
      size="compact"
      maxWidthClass="max-w-xl"
      headerClassName="pl-16"
      bodyClassName="space-y-4"
      footer={
        <div className="grid grid-cols-2 gap-3">
          <ModalButton compact variant="secondary" className="w-full" onClick={onClose}>
            {pauseModal.actions.cancel}
          </ModalButton>
          <ModalButton compact variant="primary" className="w-full" onClick={handlePause}>
            {pauseModal.actions.pause}
          </ModalButton>
        </div>
      }
    >
      <span className="absolute top-4 left-5 flex h-9 w-9 items-center justify-center rounded-full bg-warning-surface text-warning">
        <DashboardIcon name="pause" className="h-5 w-5" />
      </span>

      <div className="flex items-center justify-between rounded-xl border border-border px-4 py-3 text-sm">
        <span className="text-muted">{pauseModal.fields.customer}</span>
        <span className="font-semibold text-foreground">{record.customer}</span>
      </div>

      <Field label={pauseModal.fields.reason} size="sm" labelWeight="medium">
        <Select
          inputSize="sm"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          options={[...pauseModal.reasons]}
          className={cn(modalInputClass, 'rounded-lg border-accent/25 bg-accent-surface')}
        />
      </Field>

      <Field label={pauseModal.fields.pauseFrom} size="sm" labelWeight="medium">
        <Input
          type="date"
          inputSize="sm"
          value={pauseFrom}
          onChange={(event) => setPauseFrom(event.target.value)}
          className={cn(modalInputClass, 'rounded-lg border-accent/25 bg-accent-surface')}
        />
      </Field>

      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={notifySms}
          onChange={(event) => setNotifySms(event.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary/20"
        />
        <span>
          <span className="block text-sm font-medium text-foreground">{pauseModal.notifyLabel}</span>
          <span className="mt-0.5 block text-xs text-muted">{pauseModal.notifyHelper}</span>
        </span>
      </label>

      {notifySms ? (
        <Textarea
          inputSize="sm"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          className="min-h-[6.5rem] rounded-lg"
        />
      ) : null}

      <div className={cn(modalWarningPanelClass, 'flex gap-2.5 text-sm')}>
        <DashboardIcon name="alert-circle" className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
        <p>{pauseModal.warning}</p>
      </div>
    </Modal>
  )
}
