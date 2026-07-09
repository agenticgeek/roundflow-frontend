import { useEffect, useMemo, useState } from 'react'
import type { RoundPlannerRound, RoundPlannerWeatherHoldOption } from '@/content/round-planner'
import { roundPlannerContent } from '@/content/round-planner'
import { DashboardIcon } from '@/components/dashboard/DashboardIcon'
import { Select, Textarea } from '@/components/ui'
import { Modal, ModalButton } from '@/components/ui/modal'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'

interface MessageCustomersModalProps {
  open: boolean
  round: RoundPlannerRound | null
  onClose: () => void
}

/** Round messaging workflow opened from the round detail side panel. */
export function MessageCustomersModal({ open, round, onClose }: MessageCustomersModalProps) {
  const { messageCustomersModal } = roundPlannerContent
  const { showToast } = useToast()
  const [templateId, setTemplateId] = useState(messageCustomersModal.templates[0]?.value ?? '')
  const [message, setMessage] = useState(messageCustomersModal.templates[0]?.body ?? '')
  const [excludePaymentHold, setExcludePaymentHold] = useState(true)
  const [sendOptionId, setSendOptionId] = useState('now')
  const [channel, setChannel] = useState<string>(messageCustomersModal.channels[0] ?? 'SMS')

  const selectedTemplate = useMemo(
    () =>
      messageCustomersModal.templates.find((template) => template.value === templateId) ??
      messageCustomersModal.templates[0],
    [messageCustomersModal.templates, templateId],
  )

  const paymentHoldCount = round?.paymentHolds ?? 0
  const recipientCount = round
    ? Math.max(0, round.properties.length - (excludePaymentHold ? paymentHoldCount : 0))
    : 0
  const totalCost = recipientCount * messageCustomersModal.creditPricePerSms

  useEffect(() => {
    if (!open) return
    const initialTemplate = messageCustomersModal.templates[0]
    setTemplateId(initialTemplate?.value ?? '')
    setMessage(initialTemplate?.body ?? '')
    setExcludePaymentHold(true)
    setSendOptionId('now')
    setChannel(messageCustomersModal.channels[0] ?? 'SMS')
  }, [open, messageCustomersModal.channels, messageCustomersModal.templates])

  useEffect(() => {
    if (!selectedTemplate) return
    setMessage(selectedTemplate.body)
  }, [selectedTemplate])

  if (!round) return null

  function handleSend() {
    onClose()
    showToast(messageCustomersModal.successToast)
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={messageCustomersModal.title}
      subtitle={messageCustomersModal.subtitle}
      showCloseButton
      stacked
      size="compact"
      maxWidthClass="max-w-xl"
      headerClassName="pl-16"
      bodyClassName="space-y-4"
      footer={
        <div className="grid grid-cols-2 gap-3">
          <ModalButton compact variant="secondary" className="w-full" onClick={onClose}>
            {messageCustomersModal.actions.cancel}
          </ModalButton>
          <ModalButton
            compact
            variant="primary"
            className="flex w-full items-center justify-center gap-2"
            onClick={handleSend}
          >
            <DashboardIcon name="send" className="h-4 w-4" />
            {messageCustomersModal.actions.send.replace('{count}', String(recipientCount))}
          </ModalButton>
        </div>
      }
    >
      <span className="absolute top-4 left-5 flex h-9 w-9 items-center justify-center rounded-full bg-accent-surface text-accent">
        <DashboardIcon name="message" className="h-5 w-5" />
      </span>

      <section className="flex items-center justify-between gap-4 rounded-xl border border-accent/20 bg-accent-surface px-4 py-3">
        <div className="flex items-center gap-3">
          <DashboardIcon name="users" className="h-5 w-5 shrink-0 text-accent" />
          <div>
            <p className="text-sm font-medium text-accent">{recipientCount} recipients</p>
            <p className="mt-0.5 text-xs text-accent/80">{round.title}</p>
          </div>
        </div>
        <button type="button" className="text-xs font-semibold text-accent hover:opacity-80">
          {messageCustomersModal.recipientAction}
        </button>
      </section>

      <section>
        <label htmlFor="message-template" className="text-sm font-semibold text-foreground">
          {messageCustomersModal.fields.template}
        </label>
        <Select
          id="message-template"
          inputSize="sm"
          value={templateId}
          onChange={(event) => setTemplateId(event.target.value)}
          options={[...messageCustomersModal.templates]}
          className="mt-2 bg-card"
        />
      </section>

      <section>
        <label htmlFor="round-message" className="text-sm font-semibold text-foreground">
          {messageCustomersModal.fields.message}
        </label>
        <Textarea
          id="round-message"
          inputSize="sm"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          rows={4}
          className="mt-2 bg-card"
        />
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
          <span>
            {message.length} characters · {messageCustomersModal.meta.smsCredit}
          </span>
          <span>
            {messageCustomersModal.meta.totalPrefix} {recipientCount}{' '}
            {messageCustomersModal.meta.credits} (£{totalCost.toFixed(2)})
          </span>
        </div>
      </section>

      <section className="rounded-xl bg-surface px-4 py-3">
        <p className="text-xs font-semibold text-muted">{messageCustomersModal.fields.variables}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {messageCustomersModal.variables.map((variable) => (
            <button
              key={variable}
              type="button"
              onClick={() => setMessage((current) => `${current} ${variable}`.trim())}
              className="rounded-md bg-primary px-2 py-1 text-[11px] font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              {variable}
            </button>
          ))}
        </div>
      </section>

      <section>
        <p className="text-sm font-semibold text-foreground">{messageCustomersModal.fields.filters}</p>
        <button
          type="button"
          onClick={() => setExcludePaymentHold((current) => !current)}
          className="mt-2 flex items-center gap-2 text-sm text-foreground"
        >
          <span
            className={cn(
              'h-3.5 w-3.5 rounded-full',
              excludePaymentHold ? 'bg-primary' : 'bg-muted/40',
            )}
            aria-hidden="true"
          />
          {messageCustomersModal.filters.excludePaymentHold} ({paymentHoldCount})
        </button>
      </section>

      <section>
        <p className="text-sm font-semibold text-foreground">{messageCustomersModal.fields.sendOptions}</p>
        <div className="mt-2 space-y-2">
          {messageCustomersModal.sendOptions.map((option) => (
            <SendOption
              key={option.id}
              option={option}
              selected={sendOptionId === option.id}
              onSelect={() => setSendOptionId(option.id)}
            />
          ))}
        </div>
      </section>

      <section>
        <p className="text-sm font-semibold text-foreground">{messageCustomersModal.fields.channel}</p>
        <div className="mt-2 inline-flex rounded-xl bg-surface p-1">
          {messageCustomersModal.channels.map((item) => {
            const active = channel === item

            return (
              <button
                key={item}
                type="button"
                onClick={() => setChannel(item)}
                className={cn(
                  'rounded-lg px-4 py-2 text-sm font-semibold transition-colors',
                  active ? 'bg-primary text-primary-foreground' : 'text-muted hover:text-foreground',
                )}
              >
                {item}
              </button>
            )
          })}
        </div>
      </section>
    </Modal>
  )
}

function SendOption({
  option,
  selected,
  onSelect,
}: {
  option: RoundPlannerWeatherHoldOption
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'flex w-full gap-3 rounded-xl border px-4 py-3 text-left transition-colors',
        selected
          ? 'border-primary bg-accent-surface ring-1 ring-primary'
          : 'border-border bg-card hover:bg-surface',
      )}
    >
      <span
        className={cn(
          'mt-1 h-3.5 w-3.5 shrink-0 rounded-full',
          selected ? 'bg-primary' : 'bg-muted/50',
        )}
        aria-hidden="true"
      />
      <span>
        <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
          {option.id === 'now' ? <DashboardIcon name="send" className="h-4 w-4" /> : <DashboardIcon name="clock" className="h-4 w-4" />}
          {option.title}
        </span>
        {option.description ? (
          <span className="mt-0.5 block pl-6 text-xs text-muted">{option.description}</span>
        ) : null}
      </span>
    </button>
  )
}
