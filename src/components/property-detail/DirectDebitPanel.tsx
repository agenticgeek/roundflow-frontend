import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChannelPicker, MessagingErrorNotice } from '@/components/messaging/ChannelPicker'
import { Modal, ModalButton, ModalFooter } from '@/components/ui/modal'
import { useToast } from '@/components/ui/toast'
import { ROUTES } from '@/config/routes'
import { directDebitContent } from '@/content/direct-debit'
import { sharedActionsContent } from '@/content/shared-actions'
import { useDirectDebitLink, useDirectDebitStatus, useSendDirectDebitLink } from '@/features/direct-debit/hooks/useDirectDebit'
import { useChannelChoice } from '@/features/messaging/hooks/useChannels'
import { MANDATE_IN_PLACE, directDebitLabel, directDebitStatusClass } from '@/features/direct-debit/lib/direct-debit'
import { errorMessage } from '@/lib/errors'
import { cn } from '@/lib/utils'

const CHANNEL_LABELS = Object.fromEntries(
  sharedActionsContent.channel.options.map((option) => [option.value, option.label]),
) as Record<string, string>

const linkButtonClass = 'text-sm font-semibold text-primary underline underline-offset-2 disabled:opacity-50'

/**
 * Direct Debit row of the Payment Status card: the customer's GoCardless mandate status, and for the office a way to
 * send or copy a setup link while there is no mandate in place.
 */
export function DirectDebitPanel({
  customerId,
  customerName,
  canMutate,
}: {
  customerId: string
  customerName: string
  canMutate: boolean
}) {
  const copy = directDebitContent.panel
  const { showToast } = useToast()
  const status = useDirectDebitStatus(customerId)
  const copyLink = useDirectDebitLink(customerId)
  const [sendOpen, setSendOpen] = useState(false)

  const data = status.data
  const value = data ? directDebitLabel(data) : copy.loading
  const inPlace = Boolean(data?.mandateStatus && MANDATE_IN_PLACE.has(data.mandateStatus))
  const showActions = canMutate && data && !inPlace

  async function handleCopy() {
    let url: string | null = null
    try {
      url = (await copyLink.mutateAsync()).url
      await navigator.clipboard.writeText(url)
      showToast(copy.copied)
    } catch (caught) {
      showToast(url ? copy.copyFailed.replace('{url}', url) : errorMessage(caught))
    }
  }

  return (
    <div className="space-y-2 text-sm">
      <div className="flex items-center justify-between gap-4">
        <dt className="text-muted">{copy.label}</dt>
        <dd className={cn('font-semibold text-foreground', data ? directDebitStatusClass(data.mandateStatus) : 'text-muted')}>{value}</dd>
      </div>
      {showActions && data.gocardlessConnected ? (
        <div className="flex flex-wrap justify-end gap-4">
          <button type="button" className={linkButtonClass} onClick={() => setSendOpen(true)}>
            {data.linkSentAt ? copy.resendLink : copy.sendLink}
          </button>
          <button type="button" className={linkButtonClass} disabled={copyLink.isPending} onClick={() => void handleCopy()}>
            {copy.copyLink}
          </button>
        </div>
      ) : null}
      {showActions && !data.gocardlessConnected ? (
        <p className="text-right text-xs text-muted">
          {copy.notConnected}{' '}
          <Link to={ROUTES.settingsIntegrations} className="font-semibold text-primary underline underline-offset-2">
            {copy.settingsLink}
          </Link>
        </p>
      ) : null}
      {sendOpen ? (
        <SendDirectDebitLinkModal customerId={customerId} customerName={customerName} onClose={() => setSendOpen(false)} />
      ) : null}
    </div>
  )
}

/** Channel choice + send. Mount only while open. */
export function SendDirectDebitLinkModal({
  customerId,
  customerName,
  onClose,
}: {
  customerId: string
  customerName: string
  onClose: () => void
}) {
  const copy = directDebitContent.sendModal
  const { showToast } = useToast()
  const send = useSendDirectDebitLink(customerId)
  const [channel, setChannel] = useChannelChoice()

  async function submit() {
    try {
      const result = await send.mutateAsync(channel)
      showToast(copy.done.replace('{customer}', customerName).replace('{channel}', CHANNEL_LABELS[result.channel] ?? result.channel))
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
      subtitle={copy.subtitle.replace('{customer}', customerName)}
      size="compact"
      bodyClassName="space-y-4"
      footer={
        <ModalFooter compact>
          <ModalButton compact onClick={onClose} disabled={send.isPending}>
            {copy.cancel}
          </ModalButton>
          <ModalButton compact variant="primary" loading={send.isPending} onClick={() => void submit()}>
            {send.isPending ? copy.sending : copy.send}
          </ModalButton>
        </ModalFooter>
      }
    >
      <ChannelPicker value={channel} onChange={setChannel} disabled={send.isPending} />
      <p className="text-xs text-muted">{copy.note}</p>
      <MessagingErrorNotice error={send.error} />
    </Modal>
  )
}
