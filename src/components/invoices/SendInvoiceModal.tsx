import { useState } from 'react'
import type { SendChannel } from '@/api/invoices.api'
import { ChannelPicker, MessagingErrorNotice } from '@/components/messaging/ChannelPicker'
import { Modal, ModalButton, ModalFooter, modalWarningPanelClass } from '@/components/ui/modal'
import { useToast } from '@/components/ui/toast'
import { invoicesContent } from '@/content/invoices'
import { sharedActionsContent } from '@/content/shared-actions'
import { useSendInvoiceVia } from '@/features/invoices/hooks/useInvoiceActions'
import { ApiError } from '@/lib/errors'

export type SendableInvoice = { id: string; invoiceNumber: string; customerName: string }

const CHANNEL_LABELS = Object.fromEntries(
  sharedActionsContent.channel.options.map((option) => [option.value, option.label]),
) as Record<string, string>

/**
 * Send an invoice with a channel (GAP-034). INVOICE_ALREADY_SENT offers "Send again"
 * (`resend: true`); messaging setup errors show their fix. Mount only while open.
 */
export function SendInvoiceModal({ invoice, onClose }: { invoice: SendableInvoice; onClose: () => void }) {
  const copy = invoicesContent.sendModal
  const { showToast } = useToast()
  const send = useSendInvoiceVia()
  const [channel, setChannel] = useState<SendChannel>('AUTO')

  const alreadySent =
    send.error instanceof ApiError && send.error.code === 'INVOICE_ALREADY_SENT' ? send.error : null

  async function submit() {
    try {
      const result = await send.mutateAsync({
        invoiceId: invoice.id,
        input: alreadySent ? { channel, resend: true } : { channel },
      })
      showToast(copy.done.replace('{invoice}', result.invoiceNumber).replace('{channel}', CHANNEL_LABELS[result.channel]))
      onClose()
    } catch {
      // Shown inline below.
    }
  }

  return (
    <Modal
      open
      onClose={send.isPending ? () => undefined : onClose}
      title={copy.title}
      subtitle={copy.subtitle.replace('{invoice}', invoice.invoiceNumber).replace('{customer}', invoice.customerName)}
      size="compact"
      bodyClassName="space-y-4"
      footer={
        <ModalFooter compact>
          <ModalButton compact onClick={onClose} disabled={send.isPending}>
            {copy.cancel}
          </ModalButton>
          <ModalButton compact variant="primary" loading={send.isPending} onClick={() => void submit()}>
            {send.isPending ? copy.sending : alreadySent ? copy.sendAgain : copy.send}
          </ModalButton>
        </ModalFooter>
      }
    >
      <ChannelPicker value={channel} onChange={setChannel} disabled={send.isPending} />
      {alreadySent ? (
        <p role="alert" className={modalWarningPanelClass}>
          {alreadySent.message} {copy.alreadySent}
        </p>
      ) : (
        <MessagingErrorNotice error={send.error} />
      )}
    </Modal>
  )
}
