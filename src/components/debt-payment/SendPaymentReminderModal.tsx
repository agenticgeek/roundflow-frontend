import { useEffect, useMemo, useState } from 'react'
import type { DebtCustomerRecord } from '@/content/debt-payment'
import { debtPaymentContent } from '@/content/debt-payment'
import { DashboardIcon } from '@/components/dashboard/DashboardIcon'
import { Field, Select, Textarea } from '@/components/ui'
import { Modal, ModalButton, modalInputClass } from '@/components/ui/modal'
import { useToast } from '@/components/ui/toast'
import { useDebtRemind } from '@/features/debt/hooks/useDebt'
import { UI_CHANNEL_TO_API } from '@/features/debt/lib/mappers'
import { useAppBootstrap } from '@/providers/AppBootstrapProvider'
import { ApiError } from '@/lib/errors'
import { cn } from '@/lib/utils'

interface SendPaymentReminderModalProps {
  open: boolean
  record: DebtCustomerRecord | null
  onClose: () => void
}

type ReminderChannel = (typeof debtPaymentContent.reminderModal.channels)[number]['id']

function firstName(fullName: string) {
  return fullName.trim().split(/\s+/)[0] ?? fullName
}

function applyTemplate(body: string, record: DebtCustomerRecord) {
  return body
    .replaceAll('{firstName}', firstName(record.customer))
    .replaceAll('{amount}', record.amountOwed)
    .replaceAll('{customer}', record.customer)
}

/** Send SMS / WhatsApp / email payment reminder — POST /debt/:invoiceId/remind. */
export function SendPaymentReminderModal({ open, record, onClose }: SendPaymentReminderModalProps) {
  const { reminderModal } = debtPaymentContent
  const { showToast } = useToast()
  const { canMutate } = useAppBootstrap()
  const remind = useDebtRemind()
  const [channel, setChannel] = useState<ReminderChannel>('email')
  const [templateId, setTemplateId] = useState<string>(reminderModal.templates[0]?.value ?? '')
  const [message, setMessage] = useState('')

  const selectedTemplate = useMemo(
    () =>
      reminderModal.templates.find((template) => template.value === templateId) ??
      reminderModal.templates[0],
    [reminderModal.templates, templateId],
  )

  useEffect(() => {
    if (!open || !record) return
    setChannel('email')
    setTemplateId(reminderModal.templates[0]?.value ?? '')
    setMessage(applyTemplate(reminderModal.templates[0]?.body ?? '', record))
  }, [open, record, reminderModal.templates])

  useEffect(() => {
    if (!record || !selectedTemplate) return
    setMessage(applyTemplate(selectedTemplate.body, record))
  }, [record, selectedTemplate])

  if (!record) return null

  async function handleSend() {
    if (!canMutate || !record || remind.isPending) return
    if (!message.trim()) {
      showToast('Enter a reminder message')
      return
    }

    try {
      await remind.mutateAsync({
        invoiceId: record.invoiceId ?? record.id,
        input: {
          channel: UI_CHANNEL_TO_API[channel] ?? 'EMAIL',
          message: message.trim(),
        },
      })
      onClose()
      showToast(reminderModal.successToast.replace('{customer}', record.customer))
    } catch (error) {
      if (error instanceof ApiError && (error.status === 400 || error.status === 404)) {
        showToast(error.message)
        return
      }
      showToast(error instanceof Error ? error.message : 'Could not send reminder')
    }
  }

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
          <ModalButton
            compact
            variant="secondary"
            className="w-full"
            disabled={remind.isPending}
            onClick={onClose}
          >
            {reminderModal.actions.cancel}
          </ModalButton>
          <ModalButton
            compact
            variant="primary"
            className="w-full"
            disabled={!canMutate || !message.trim() || remind.isPending}
            onClick={() => void handleSend()}
          >
            {remind.isPending ? 'Sending…' : reminderModal.actions.send}
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

      <section>
        <p className="text-sm font-medium text-foreground">{reminderModal.sendVia}</p>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {reminderModal.channels.map((item) => {
            const selected = channel === item.id
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setChannel(item.id)}
                disabled={remind.isPending}
                className={cn(
                  'rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50',
                  selected
                    ? 'bg-primary text-primary-foreground'
                    : 'border border-border bg-card text-muted hover:text-foreground',
                )}
              >
                {item.label}
              </button>
            )
          })}
        </div>
      </section>

      <Field label={reminderModal.templateLabel} size="sm" labelWeight="medium">
        <Select
          inputSize="sm"
          value={templateId}
          onChange={(event) => setTemplateId(event.target.value)}
          options={reminderModal.templates.map(({ value, label }) => ({ value, label }))}
          className={cn(modalInputClass, 'rounded-lg border-accent/25 bg-accent-surface')}
          disabled={remind.isPending}
        />
      </Field>

      <Field label={reminderModal.messageLabel} size="sm" labelWeight="medium">
        <Textarea
          inputSize="sm"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          className="min-h-[8rem] rounded-lg"
          disabled={remind.isPending}
        />
        <p className="mt-1.5 text-xs text-muted">
          {reminderModal.characterCount.replace('{count}', String(message.length))}
        </p>
      </Field>
    </Modal>
  )
}
