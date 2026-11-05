import { useEffect, useState } from 'react'
import type { SendChannel } from '@/api/invoices.api'
import type { DebtCustomerRecord } from '@/content/debt-payment'
import { debtPaymentContent } from '@/content/debt-payment'
import { DashboardIcon } from '@/components/dashboard/DashboardIcon'
import { ChannelPicker, MessagingErrorNotice } from '@/components/messaging/ChannelPicker'
import { Field, Select, Textarea } from '@/components/ui'
import { Modal, ModalButton, modalInputClass } from '@/components/ui/modal'
import { useToast } from '@/components/ui/toast'
import { useDebtRemind } from '@/features/debt/hooks/useDebt'
import { useAppBootstrap } from '@/providers/AppBootstrapProvider'
import { cn } from '@/lib/utils'

interface SendPaymentReminderModalProps {
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
    .replaceAll('{customer}', record.customer)
}

/**
 * Payment reminder — POST /debt/:invoiceId/remind with a channel (Auto / SMS / Email /
 * WhatsApp, GAP-034). Messaging errors stay in the modal with their fix.
 */
export function SendPaymentReminderModal({ open, record, onClose }: SendPaymentReminderModalProps) {
  const { reminderModal } = debtPaymentContent
  const { showToast } = useToast()
  const { canMutate } = useAppBootstrap()
  const remind = useDebtRemind()
  const { reset } = remind
  const templates = reminderModal.templates
  const [channel, setChannel] = useState<SendChannel>('AUTO')
  const [templateId, setTemplateId] = useState<string>(templates[0].value)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!open || !record) return
    setChannel('AUTO')
    setTemplateId(templates[0].value)
    setMessage(applyTemplate(templates[0].body, record))
    reset()
  }, [open, record, templates, reset])

  if (!record?.invoiceId) return null
  const invoiceId = record.invoiceId

  function pickTemplate(value: string) {
    setTemplateId(value)
    const template = templates.find((item) => item.value === value)!
    setMessage(applyTemplate(template.body, record!))
  }

  async function handleSend() {
    try {
      await remind.mutateAsync({ invoiceId, input: { channel, message: message.trim() } })
      onClose()
      showToast(reminderModal.successToast.replace('{customer}', record!.customer))
    } catch {
      // Shown inline by MessagingErrorNotice.
    }
  }

  const empty = !message.trim()

  return (
    <Modal
      open={open}
      onClose={remind.isPending ? () => undefined : onClose}
      title={reminderModal.title}
      showCloseButton
      stacked
      size="compact"
      maxWidthClass="max-w-xl"
      headerClassName="pl-16"
      bodyClassName="space-y-4"
      footer={
        <div className="grid grid-cols-2 gap-3">
          <ModalButton compact variant="secondary" className="w-full" disabled={remind.isPending} onClick={onClose}>
            {reminderModal.actions.cancel}
          </ModalButton>
          <ModalButton
            compact
            variant="primary"
            className="w-full"
            disabled={!canMutate || empty || remind.isPending}
            onClick={() => void handleSend()}
          >
            {remind.isPending ? reminderModal.actions.sending : reminderModal.actions.send}
          </ModalButton>
        </div>
      }
    >
      <span className="absolute top-4 left-5 flex h-9 w-9 items-center justify-center rounded-lg bg-accent-surface text-primary">
        <DashboardIcon name="message" className="h-5 w-5" />
      </span>

      <div className="rounded-xl border border-border bg-surface px-4 py-3 text-sm">
        <span className="text-muted">{reminderModal.toLabel} </span>
        <span className="font-semibold text-foreground">{record.customer}</span>
      </div>

      <ChannelPicker value={channel} onChange={setChannel} disabled={remind.isPending} label={reminderModal.sendVia} />

      <Field label={reminderModal.templateLabel} size="sm" labelWeight="medium">
        <Select
          inputSize="sm"
          aria-label={reminderModal.templateLabel}
          value={templateId}
          onChange={(event) => pickTemplate(event.target.value)}
          options={templates.map(({ value, label }) => ({ value, label }))}
          className={cn(modalInputClass, 'rounded-lg border-accent/25 bg-accent-surface')}
          disabled={remind.isPending}
        />
      </Field>

      <Field label={reminderModal.messageLabel} size="sm" labelWeight="medium" error={empty ? reminderModal.messageRequired : null}>
        <Textarea
          inputSize="sm"
          aria-label={reminderModal.messageLabel}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          className="min-h-[8rem] rounded-lg"
          disabled={remind.isPending}
        />
        <p className="mt-1.5 text-xs text-muted">
          {reminderModal.characterCount.replace('{count}', String(message.length))}
        </p>
      </Field>

      <MessagingErrorNotice error={remind.error} />
    </Modal>
  )
}
