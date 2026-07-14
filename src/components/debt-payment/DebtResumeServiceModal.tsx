import { useEffect, useState } from 'react'
import type { DebtCustomerRecord } from '@/content/debt-payment'
import { debtPaymentContent } from '@/content/debt-payment'
import { DashboardIcon } from '@/components/dashboard/DashboardIcon'
import { Field, Input } from '@/components/ui'
import { Modal, ModalButton, modalInputClass } from '@/components/ui/modal'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'

interface DebtResumeServiceModalProps {
  open: boolean
  record: DebtCustomerRecord | null
  onClose: () => void
}

/** Resume a paused service for a debt-risk customer. */
export function DebtResumeServiceModal({ open, record, onClose }: DebtResumeServiceModalProps) {
  const { resumeModal } = debtPaymentContent
  const { showToast } = useToast()
  const [resumeFrom, setResumeFrom] = useState<string>(resumeModal.defaultResumeFrom)
  const [notify, setNotify] = useState(true)

  useEffect(() => {
    if (!open) return
    setResumeFrom(resumeModal.defaultResumeFrom)
    setNotify(true)
  }, [open, resumeModal.defaultResumeFrom])

  if (!record) return null

  const customerName = record.customer

  function handleResume() {
    onClose()
    showToast(resumeModal.successToast.replace('{customer}', customerName))
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={resumeModal.title}
      showCloseButton
      stacked
      size="compact"
      maxWidthClass="max-w-xl"
      headerClassName="pl-16"
      bodyClassName="space-y-4"
      footer={
        <div className="grid grid-cols-2 gap-3">
          <ModalButton compact variant="secondary" className="w-full" onClick={onClose}>
            {resumeModal.actions.cancel}
          </ModalButton>
          <ModalButton compact variant="primary" className="w-full" onClick={handleResume}>
            {resumeModal.actions.resume}
          </ModalButton>
        </div>
      }
    >
      <span className="absolute top-4 left-5 flex h-9 w-9 items-center justify-center rounded-full bg-success/10 text-success">
        <DashboardIcon name="play" className="h-5 w-5" />
      </span>

      <div className="flex items-center justify-between rounded-xl border border-border px-4 py-3 text-sm">
        <span className="text-muted">{resumeModal.fields.customer}</span>
        <span className="font-semibold text-foreground">{record.customer}</span>
      </div>

      <Field label={resumeModal.fields.resumeFrom} size="sm" labelWeight="medium">
        <Input
          type="date"
          inputSize="sm"
          value={resumeFrom}
          onChange={(event) => setResumeFrom(event.target.value)}
          className={cn(modalInputClass, 'rounded-lg border-accent/25 bg-accent-surface')}
        />
      </Field>

      <div className="flex items-center justify-between rounded-xl border border-border px-4 py-3 text-sm">
        <span className="text-muted">{resumeModal.fields.nextDue}</span>
        <span className="font-semibold text-foreground">{resumeModal.defaultNextDue}</span>
      </div>

      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={notify}
          onChange={(event) => setNotify(event.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary/20"
        />
        <span>
          <span className="block text-sm font-medium text-foreground">{resumeModal.notifyLabel}</span>
          <span className="mt-0.5 block text-xs text-muted">{resumeModal.notifyHelper}</span>
        </span>
      </label>

      <div className="flex gap-2.5 rounded-xl border border-success/20 bg-success/5 px-4 py-3 text-sm text-success">
        <DashboardIcon name="check-circle" className="mt-0.5 h-4 w-4 shrink-0" />
        <p>{resumeModal.info}</p>
      </div>
    </Modal>
  )
}
