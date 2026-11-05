import { useState } from 'react'
import type { InvoiceRecord, SendChannel } from '@/api/invoices.api'
import { MarkInvoicePaidModal } from '@/components/invoices/MarkInvoicePaidModal'
import { ChannelPicker, MessagingErrorNotice } from '@/components/messaging/ChannelPicker'
import { ModalButton } from '@/components/ui/modal'
import { useToast } from '@/components/ui/toast'
import { propertyDetailContent } from '@/content/property-detail'
import { sharedActionsContent } from '@/content/shared-actions'
import { useSendInvoiceVia } from '@/features/invoices/hooks/useInvoiceActions'
import { formatInvoiceMoney, formatInvoiceNumber } from '@/features/invoices/lib/mappers'
import { ApiError } from '@/lib/errors'

const CHANNEL_LABELS: Record<string, string> = Object.fromEntries(
  sharedActionsContent.channel.options.map((option) => [option.value, option.label]),
)

/**
 * Send / mark-paid actions for a saved, unpaid invoice (GAP-034, GAP-027 part 2): pick a
 * channel, send (or "Send again" for an already-sent one), with the server error and a
 * specific CTA (Connect Stripe / Connect messaging) when sending fails.
 */
export function InvoiceSendPanel({ invoice, customerName }: { invoice: InvoiceRecord; customerName: string }) {
  const copy = propertyDetailContent.sendInvoice
  const { showToast } = useToast()
  const send = useSendInvoiceVia()
  const [channel, setChannel] = useState<SendChannel>('AUTO')
  const [error, setError] = useState<unknown>(null)
  const [markPaidOpen, setMarkPaidOpen] = useState(false)
  const alreadySent =
    invoice.status === 'SENT' || (error instanceof ApiError && error.code === 'INVOICE_ALREADY_SENT')

  async function handleSend() {
    setError(null)
    try {
      const result = await send.mutateAsync({
        invoiceId: invoice.id,
        input: alreadySent ? { channel, resend: true } : { channel },
      })
      showToast(copy.sentToast.replace('{channel}', CHANNEL_LABELS[result.channel]))
    } catch (caught) {
      setError(caught)
    }
  }

  const showError = error && !(error instanceof ApiError && error.code === 'INVOICE_ALREADY_SENT')

  return (
    <section className="space-y-3 rounded-xl border border-border bg-surface p-4">
      <ChannelPicker value={channel} onChange={setChannel} disabled={send.isPending} />
      {alreadySent ? <p className="text-sm text-muted">{copy.alreadySent}</p> : null}
      {showError ? <MessagingErrorNotice error={error} /> : null}
      <div className="flex flex-wrap justify-end gap-2">
        <ModalButton compact onClick={() => setMarkPaidOpen(true)} disabled={send.isPending}>
          {sharedActionsContent.markPaid.action}
        </ModalButton>
        <ModalButton compact variant="primary" loading={send.isPending} onClick={() => void handleSend()}>
          {alreadySent ? copy.sendAgain : propertyDetailContent.generateInvoiceModal.actions.sendNow}
        </ModalButton>
      </div>
      {markPaidOpen ? (
        <MarkInvoicePaidModal
          invoice={{
            id: invoice.id,
            invoiceNumber: formatInvoiceNumber(invoice.invoiceNumber),
            amountLabel: formatInvoiceMoney(invoice.amount),
            customerName: invoice.customer?.name || customerName,
            paymentMethod: invoice.paymentMethod,
          }}
          onClose={() => setMarkPaidOpen(false)}
        />
      ) : null}
    </section>
  )
}
