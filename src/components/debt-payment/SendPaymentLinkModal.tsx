import { useEffect, useState } from 'react'
import type { DebtCustomerRecord } from '@/content/debt-payment'
import { debtPaymentContent } from '@/content/debt-payment'
import { DashboardIcon } from '@/components/dashboard/DashboardIcon'
import { Field, Select, Textarea } from '@/components/ui'
import { Modal, ModalButton, modalInputClass } from '@/components/ui/modal'
import { useToast } from '@/components/ui/toast'
import { useDebtPaymentLink } from '@/features/debt/hooks/useDebt'
import { useAppBootstrap } from '@/providers/AppBootstrapProvider'
import { ApiError } from '@/lib/errors'
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

/** Send payment link — POST /debt/:invoiceId/payment-link. */
export function SendPaymentLinkModal({ open, record, onClose }: SendPaymentLinkModalProps) {
  const { paymentLinkModal } = debtPaymentContent
  const { showToast } = useToast()
  const { canMutate } = useAppBootstrap()
  const paymentLink = useDebtPaymentLink()
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

  async function handleSend() {
    if (!canMutate || !record || paymentLink.isPending) return
    if (!message.trim()) {
      showToast('Enter a message')
      return
    }

    try {
      await paymentLink.mutateAsync({
        invoiceId: record.invoiceId ?? record.id,
        input: { message: message.trim() },
      })
      onClose()
      showToast(paymentLinkModal.successToast.replace('{customer}', record.customer))
    } catch (error) {
      if (error instanceof ApiError && (error.status === 400 || error.status === 404)) {
        showToast(error.message)
        return
      }
      showToast(error instanceof Error ? error.message : 'Could not send payment link')
    }
  }

  return (
    <Modal
      open={open}
      onClose={paymentLink.isPending ? () => undefined : onClose}
      title={paymentLinkModal.title}
      showCloseButton
      stacked
      size="compact"
      maxWidthClass="max-w-xl"
      headerClassName="pl-16"
      bodyClassName="space-y-4"
      footer={
        <div className="grid grid-cols-2 gap-3">
          <ModalButton
            compact
            variant="secondary"
            className="w-full"
            disabled={paymentLink.isPending}
            onClick={onClose}
          >
            {paymentLinkModal.actions.cancel}
          </ModalButton>
          <ModalButton
            compact
            variant="primary"
            className="w-full"
            disabled={!canMutate || !message.trim() || paymentLink.isPending}
            onClick={() => void handleSend()}
          >
            {paymentLink.isPending ? 'Sending…' : paymentLinkModal.actions.send}
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
          disabled={paymentLink.isPending}
        />
      </Field>

      <Field label={paymentLinkModal.fields.expiry} size="sm" labelWeight="medium">
        <Select
          inputSize="sm"
          value={expiry}
          onChange={(event) => setExpiry(event.target.value)}
          options={[...paymentLinkModal.expiryOptions]}
          className={cn(modalInputClass, 'rounded-lg border-accent/25 bg-accent-surface')}
          disabled={paymentLink.isPending}
        />
      </Field>

      <Field label={paymentLinkModal.fields.message} size="sm" labelWeight="medium">
        <Textarea
          inputSize="sm"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          className="min-h-[7.5rem] rounded-lg"
          disabled={paymentLink.isPending}
        />
        <p className="mt-1.5 text-xs text-muted">{paymentLinkModal.helper}</p>
      </Field>
    </Modal>
  )
}
