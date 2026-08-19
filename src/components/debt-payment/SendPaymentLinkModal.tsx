import { useEffect, useState } from 'react'
import type { DebtCustomerRecord } from '@/content/debt-payment'
import { debtPaymentContent } from '@/content/debt-payment'
import { DashboardIcon } from '@/components/dashboard/DashboardIcon'
import { Field, Select, Textarea } from '@/components/ui'
import { Modal, ModalButton, modalInputClass } from '@/components/ui/modal'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'

interface SendPaymentLinkModalProps {
  open: boolean
  record: DebtCustomerRecord | null
  onClose: () => void
}

function firstName(fullName: string) {
  return fullName.trim().split(/\s+/)[0] ?? fullName
}

function applyTemplate(body: string, record: DebtCustomerRecord) {
  return body
    .replaceAll('{firstName}', firstName(record.customer))
    .replaceAll('{amount}', record.amountOwed)
}

/** Generate and send a secure payment link from the debt board. */
export function SendPaymentLinkModal({ open, record, onClose }: SendPaymentLinkModalProps) {
  const { paymentLinkModal } = debtPaymentContent
  const { showToast } = useToast()
  const [method, setMethod] = useState<string>(paymentLinkModal.methods[0]?.value ?? '')
  const [expiry, setExpiry] = useState<string>(paymentLinkModal.expiryOptions[1]?.value ?? '7')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!open || !record) return
    setMethod(paymentLinkModal.methods[0]?.value ?? '')
    setExpiry(paymentLinkModal.expiryOptions[1]?.value ?? '7')
    setMessage(applyTemplate(paymentLinkModal.defaultMessage, record))
  }, [open, paymentLinkModal, record])

  if (!record) return null

  const customerName = record.customer

  function handleSend() {
    onClose()
    showToast(paymentLinkModal.successToast.replace('{customer}', customerName))
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={paymentLinkModal.title}
      showCloseButton
      stacked
      size="compact"
      maxWidthClass="max-w-xl"
      headerClassName="pl-16"
      bodyClassName="space-y-4"
      footer={
        <div className="grid grid-cols-2 gap-3">
          <ModalButton compact variant="secondary" className="w-full" onClick={onClose}>
            {paymentLinkModal.actions.cancel}
          </ModalButton>
          <ModalButton compact variant="primary" className="w-full" onClick={handleSend}>
            {paymentLinkModal.actions.send}
          </ModalButton>
        </div>
      }
    >
      <span className="absolute top-4 left-5 flex h-9 w-9 items-center justify-center rounded-full bg-success/10 text-success">
        <DashboardIcon name="link" className="h-5 w-5" />
      </span>

      <div className="flex items-center justify-between rounded-xl border border-border px-4 py-3 text-sm">
        <span className="text-muted">{paymentLinkModal.fields.customer}</span>
        <span className="font-semibold text-foreground">{record.customer}</span>
      </div>

      <div className="flex items-center justify-between rounded-xl border border-danger/20 bg-danger/5 px-4 py-3">
        <span className="text-sm font-semibold text-danger">{paymentLinkModal.fields.amount}</span>
        <span className="text-lg font-bold text-danger">{record.amountOwed}</span>
      </div>

      <Field label={paymentLinkModal.fields.method} size="sm" labelWeight="medium">
        <Select
          inputSize="sm"
          value={method}
          onChange={(event) => setMethod(event.target.value)}
          options={[...paymentLinkModal.methods]}
          className={cn(modalInputClass, 'rounded-lg border-accent/25 bg-accent-surface')}
        />
      </Field>

      <Field label={paymentLinkModal.fields.expiry} size="sm" labelWeight="medium">
        <Select
          inputSize="sm"
          value={expiry}
          onChange={(event) => setExpiry(event.target.value)}
          options={[...paymentLinkModal.expiryOptions]}
          className={cn(modalInputClass, 'rounded-lg border-accent/25 bg-accent-surface')}
        />
      </Field>

      <Field label={paymentLinkModal.fields.message} size="sm" labelWeight="medium">
        <Textarea
          inputSize="sm"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          className="min-h-[7.5rem] rounded-lg"
        />
        <p className="mt-1.5 text-xs text-muted">{paymentLinkModal.helper}</p>
      </Field>
    </Modal>
  )
}
