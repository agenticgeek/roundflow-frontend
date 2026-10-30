import { useEffect, useState } from 'react'
import type { SendChannel } from '@/api/invoices.api'
import type { DebtCustomerRecord } from '@/content/debt-payment'
import { debtPaymentContent } from '@/content/debt-payment'
import { DashboardIcon } from '@/components/dashboard/DashboardIcon'
import { ChannelPicker, MessagingErrorNotice } from '@/components/messaging/ChannelPicker'
import { Field, Textarea } from '@/components/ui'
import { Modal, ModalButton } from '@/components/ui/modal'
import { useToast } from '@/components/ui/toast'
import { useDebtPaymentLink } from '@/features/debt/hooks/useDebt'
import { useAppBootstrap } from '@/providers/AppBootstrapProvider'

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

function formatExpiry(iso: string) {
  return new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

/**
 * Send a Stripe payment link — POST /debt/:invoiceId/payment-link with a channel (GAP-034).
 * A setup problem (Stripe / messaging not connected, no contact for the channel) stays in the
 * modal with its fix.
 */
export function SendPaymentLinkModal({ open, record, onClose }: SendPaymentLinkModalProps) {
  const { paymentLinkModal } = debtPaymentContent
  const { showToast } = useToast()
  const { canMutate } = useAppBootstrap()
  const paymentLink = useDebtPaymentLink()
  const { reset } = paymentLink
  const [channel, setChannel] = useState<SendChannel>('AUTO')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!open || !record) return
    setChannel('AUTO')
    setMessage(applyTemplate(paymentLinkModal.defaultMessage, record))
    reset()
  }, [open, paymentLinkModal, record, reset])

  if (!record?.invoiceId) return null
  const invoiceId = record.invoiceId

  async function handleSend() {
    try {
      const result = await paymentLink.mutateAsync({ invoiceId, input: { channel, message: message.trim() } })
      onClose()
      const description = result.expiresAt
        ? paymentLinkModal.stripeLinkNote.replace('{when}', formatExpiry(result.expiresAt))
        : result.url
      showToast(paymentLinkModal.successToast.replace('{customer}', record!.customer), { description })
    } catch {
      // Shown inline by MessagingErrorNotice.
    }
  }

  const empty = !message.trim()

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
          <ModalButton compact variant="secondary" className="w-full" disabled={paymentLink.isPending} onClick={onClose}>
            {paymentLinkModal.actions.cancel}
          </ModalButton>
          <ModalButton
            compact
            variant="primary"
            className="w-full"
            disabled={!canMutate || empty || paymentLink.isPending}
            onClick={() => void handleSend()}
          >
            {paymentLink.isPending ? paymentLinkModal.actions.sending : paymentLinkModal.actions.send}
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

      <ChannelPicker value={channel} onChange={setChannel} disabled={paymentLink.isPending} />

      <Field label={paymentLinkModal.fields.message} size="sm" labelWeight="medium" error={empty ? paymentLinkModal.messageRequired : null}>
        <Textarea
          inputSize="sm"
          aria-label={paymentLinkModal.fields.message}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          className="min-h-[7.5rem] rounded-lg"
          disabled={paymentLink.isPending}
        />
        <p className="mt-1.5 text-xs text-muted">{paymentLinkModal.helper}</p>
      </Field>

      <MessagingErrorNotice error={paymentLink.error} />
    </Modal>
  )
}
