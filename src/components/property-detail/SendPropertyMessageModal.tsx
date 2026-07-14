import { useEffect, useMemo, useState } from 'react'
import type { PropertyDetailRecord } from '@/content/property-detail'
import { propertyDetailContent } from '@/content/property-detail'
import { DashboardIcon } from '@/components/dashboard/DashboardIcon'
import { Select, Textarea } from '@/components/ui'
import { Modal, ModalButton } from '@/components/ui/modal'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'

interface SendPropertyMessageModalProps {
  open: boolean
  property: PropertyDetailRecord | null
  onClose: () => void
}

type MessageChannel = 'sms' | 'email'

function firstName(fullName: string) {
  return fullName.trim().split(/\s+/)[0] ?? fullName
}

function applyTemplate(body: string, property: PropertyDetailRecord) {
  return body
    .replaceAll('{firstName}', firstName(property.customerName))
    .replaceAll('{nextDue}', property.nextDue)
    .replaceAll('{technician}', property.technician)
    .replaceAll('{price}', property.price)
    .replaceAll('{customer}', property.customerName)
}

/** Send SMS or email to a single customer — opened from property detail header. */
export function SendPropertyMessageModal({ open, property, onClose }: SendPropertyMessageModalProps) {
  const { sendMessageModal } = propertyDetailContent
  const { showToast } = useToast()
  const [channel, setChannel] = useState<MessageChannel>('sms')
  const [templateId, setTemplateId] = useState<string>(sendMessageModal.templates[0]?.value ?? '')
  const [message, setMessage] = useState('')

  const selectedTemplate = useMemo(
    () =>
      sendMessageModal.templates.find((template) => template.value === templateId) ??
      sendMessageModal.templates[0],
    [sendMessageModal.templates, templateId],
  )

  useEffect(() => {
    if (!open || !property) return
    const initialTemplate = sendMessageModal.templates[0]
    setChannel('sms')
    setTemplateId(initialTemplate?.value ?? '')
    setMessage(
      applyTemplate(
        initialTemplate?.smsBody ?? '',
        property,
      ),
    )
  }, [open, property, sendMessageModal.templates])

  useEffect(() => {
    if (!property || !selectedTemplate) return
    setMessage(applyTemplate(channel === 'sms' ? selectedTemplate.smsBody : selectedTemplate.emailBody, property))
  }, [channel, property, selectedTemplate])

  if (!property) return null

  const subtitle = sendMessageModal.subtitle.replace('{customer}', property.customerName)
  const meta = sendMessageModal.meta.replace('{count}', String(message.length))
  const sendLabel =
    channel === 'sms' ? sendMessageModal.actions.sendSms : sendMessageModal.actions.sendEmail
  const contactLine = `${property.phone} · ${property.email}`

  function handleSend() {
    onClose()
    showToast(
      channel === 'sms' ? sendMessageModal.successSmsToast : sendMessageModal.successEmailToast,
    )
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={sendMessageModal.title}
      subtitle={subtitle}
      showCloseButton
      stacked
      size="compact"
      maxWidthClass="max-w-xl"
      headerClassName="pl-16"
      bodyClassName="space-y-4"
      footer={
        <div className="grid grid-cols-2 gap-3">
          <ModalButton compact variant="secondary" className="w-full" onClick={onClose}>
            {sendMessageModal.actions.cancel}
          </ModalButton>
          <ModalButton compact variant="primary" className="w-full gap-2" onClick={handleSend}>
            <DashboardIcon name="message" className="h-4 w-4" />
            {sendLabel}
          </ModalButton>
        </div>
      }
    >
      <span className="absolute top-4 left-5 flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar text-sidebar-foreground">
        <DashboardIcon name="message" className="h-5 w-5" />
      </span>

      <section className="flex items-center gap-3 rounded-lg border border-border px-4 py-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface text-sm font-semibold text-muted">
          {firstName(property.customerName).charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">{property.customerName}</p>
          <p className="mt-0.5 truncate text-xs text-muted">{contactLine}</p>
        </div>
      </section>

      <section>
        <p className="text-sm font-medium text-foreground">{sendMessageModal.sendVia}</p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {(['sms', 'email'] as const).map((item) => {
            const active = channel === item
            const label = item === 'sms' ? sendMessageModal.channels.sms : sendMessageModal.channels.email
            const icon = item === 'sms' ? 'phone' : 'mail'

            return (
              <button
                key={item}
                type="button"
                onClick={() => setChannel(item)}
                className={cn(
                  'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors',
                  active
                    ? 'bg-primary text-primary-foreground'
                    : 'border border-border bg-card text-muted hover:text-foreground',
                )}
              >
                <DashboardIcon name={icon} className="h-4 w-4" />
                {label}
              </button>
            )
          })}
        </div>
      </section>

      <section>
        <label htmlFor="property-message-template" className="text-sm font-medium text-foreground">
          {sendMessageModal.fields.template}
        </label>
        <Select
          id="property-message-template"
          inputSize="sm"
          value={templateId}
          onChange={(event) => setTemplateId(event.target.value)}
          options={[...sendMessageModal.templates]}
          className="mt-2 rounded-lg border-accent/25 bg-accent-surface"
        />
      </section>

      <section>
        <label htmlFor="property-message-body" className="text-sm font-medium text-foreground">
          {sendMessageModal.fields.message}
        </label>
        <Textarea
          id="property-message-body"
          inputSize="sm"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          rows={5}
          className="mt-2 rounded-lg border-border bg-card"
        />
        <p className="mt-2 text-xs text-muted">{meta}</p>
      </section>
    </Modal>
  )
}
