import { useEffect, useMemo, useState } from 'react'
import type { RoundPlannerWeatherHoldOption } from '@/content/round-planner'
import { roundPlannerContent } from '@/content/round-planner'
import { DashboardIcon } from '@/components/dashboard/DashboardIcon'
import type { PlannerRoundSummary } from '@/components/round-planner/WeatherHoldModal'
import { Input, Select, Textarea } from '@/components/ui'
import { Modal, ModalButton } from '@/components/ui/modal'
import { useToast } from '@/components/ui/toast'
import { BroadcastResultPanel } from '@/components/messages/BroadcastResultPanel'
import { useBulkMessage, useBulkRecipients } from '@/features/messages/hooks/useMessages'
import { RECIPIENT_STATUS_LABELS, futureIsoFromLocal } from '@/features/messages/lib/broadcast-summary'
import { useMessageTemplates } from '@/features/settings/hooks/useSettings'
import type { MessageBulkResult, MessageChannel } from '@/api/messages.api'
import { useChannels } from '@/features/messaging/hooks/useChannels'
import { channelNotes, defaultMessageChannel } from '@/features/messaging/lib/channels'
import { ApiError } from '@/lib/errors'
import { useAppBootstrap } from '@/providers/AppBootstrapProvider'
import { cn } from '@/lib/utils'

function toApiChannel(channel: string): MessageChannel {
  const normalized = channel.toLowerCase()
  if (normalized === 'whatsapp') return 'whatsapp'
  if (normalized === 'email') return 'email'
  return 'sms'
}

interface MessageCustomersModalProps {
  open: boolean
  round: PlannerRoundSummary | null
  onClose: () => void
}

/** Round messaging workflow opened from the round detail side panel (POST /messages/bulk). */
export function MessageCustomersModal({ open, round, onClose }: MessageCustomersModalProps) {
  const { messageCustomersModal } = roundPlannerContent
  const { showToast } = useToast()
  const { canMutate } = useAppBootstrap()
  const bulkMessage = useBulkMessage()
  const templatesQuery = useMessageTemplates(open)
  const templates = useMemo(() => templatesQuery.data ?? [], [templatesQuery.data])
  const [templateId, setTemplateId] = useState('')
  const [message, setMessage] = useState('')
  const [excludePaymentHold, setExcludePaymentHold] = useState(true)
  const [sendOptionId, setSendOptionId] = useState('now')
  const [scheduleAt, setScheduleAt] = useState('')
  const channels = useChannels()
  const defaultChannel = defaultMessageChannel(channels) === 'sms' ? 'SMS' : 'Email'
  const [channel, setChannel] = useState<string>(defaultChannel)
  const [result, setResult] = useState<MessageBulkResult | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [deselected, setDeselected] = useState<string[]>([])

  const paymentHoldCount = round?.holdCount ?? 0
  const scheduling = sendOptionId === 'schedule'
  // The audience comes from the server, never estimated: who is reachable on this channel, minus anyone unticked.
  const recipientsQuery = useBulkRecipients(
    { roundId: round?.id ?? '', channel: toApiChannel(channel), excludePaymentHold },
    open && !result,
  )
  const allRecipients = recipientsQuery.data?.recipients
  const selectedIds = (allRecipients ?? [])
    .filter((recipient) => recipient.status === 'ok' && !deselected.includes(recipient.customerId))
    .map((recipient) => recipient.customerId)
  const recipientCount = selectedIds.length
  const recipientsReady = allRecipients !== undefined

  useEffect(() => {
    if (!open) return
    setTemplateId('')
    setMessage('')
    setExcludePaymentHold(true)
    setSendOptionId('now')
    setScheduleAt('')
    setChannel(defaultChannel)
    setResult(null)
    setPickerOpen(false)
    setDeselected([])
  }, [open, defaultChannel])

  if (!round) return null

  function handleTemplateChange(id: string) {
    setTemplateId(id)
    const template = templates.find((item) => item.id === id)
    if (template) setMessage(template.body)
  }

  async function handleSend() {
    if (!round || !canMutate || bulkMessage.isPending) return
    const body = message.trim()
    if (!body) {
      showToast('Write a message first.')
      return
    }
    if (!recipientsReady || recipientCount === 0) {
      showToast(messageCustomersModal.noRecipients)
      return
    }
    let scheduledFor: string | undefined
    if (scheduling) {
      const iso = futureIsoFromLocal(scheduleAt)
      if (!iso) {
        showToast(messageCustomersModal.scheduleInPast)
        return
      }
      scheduledFor = iso
    }
    // Only link the template when the text is still the template's own.
    const template = templates.find((item) => item.id === templateId)
    try {
      const outcome = await bulkMessage.mutateAsync({
        roundId: round.id,
        channel: toApiChannel(channel),
        body,
        excludePaymentHold,
        templateId: template && template.body.trim() === body ? template.id : undefined,
        customerIds: deselected.length > 0 ? selectedIds : undefined,
        scheduledFor,
      })
      setResult(outcome)
      showToast(scheduling ? messageCustomersModal.scheduledToast : messageCustomersModal.successToast)
    } catch (error) {
      showToast(
        error instanceof ApiError && error.status === 409
          ? 'Messaging isn’t connected yet (GoHighLevel). Connect it in Settings first.'
          : error instanceof Error
            ? error.message
            : 'Could not send the messages.',
      )
    }
  }

  const sendLabel = (scheduling ? messageCustomersModal.actions.schedule : messageCustomersModal.actions.send).replace(
    '{count}',
    recipientsReady ? String(recipientCount) : '…',
  )

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
        result ? (
          <ModalButton compact variant="primary" className="w-full" onClick={onClose}>
            {messageCustomersModal.actions.done}
          </ModalButton>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <ModalButton compact variant="secondary" className="w-full" onClick={onClose}>
              {messageCustomersModal.actions.cancel}
            </ModalButton>
            <ModalButton
              compact
              variant="primary"
              className="flex w-full items-center justify-center gap-2"
              disabled={!canMutate || bulkMessage.isPending || !recipientsReady || recipientCount === 0}
              onClick={() => void handleSend()}
            >
              <DashboardIcon name="send" className="h-4 w-4" />
              {bulkMessage.isPending ? 'Sending…' : sendLabel}
            </ModalButton>
          </div>
        )
      }
    >
      <span className="absolute top-4 left-5 flex h-9 w-9 items-center justify-center rounded-full bg-accent-surface text-accent">
        <DashboardIcon name="message" className="h-5 w-5" />
      </span>

      {result ? (
        <BroadcastResultPanel result={result} notMessagedTitle={messageCustomersModal.result.notMessaged} />
      ) : (
        <>
          <section className="rounded-xl border border-accent/20 bg-accent-surface px-4 py-3">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <DashboardIcon name="users" className="h-5 w-5 shrink-0 text-accent" />
                <div>
                  <p className="text-sm font-medium text-accent">
                    {recipientsQuery.isError
                      ? messageCustomersModal.recipientsError
                      : recipientsReady
                        ? `${recipientCount} recipients`
                        : messageCustomersModal.recipientsLoading}
                  </p>
                  <p className="mt-0.5 text-xs text-accent/80">{round.name}</p>
                </div>
              </div>
              <button
                type="button"
                disabled={!recipientsReady}
                aria-expanded={pickerOpen}
                onClick={() => setPickerOpen((current) => !current)}
                className="text-xs font-semibold text-accent hover:opacity-80 disabled:opacity-50"
              >
                {messageCustomersModal.recipientAction}
              </button>
            </div>
            {recipientsQuery.data && recipientsQuery.data.total > recipientsQuery.data.reachable ? (
              <p className="mt-2 text-xs text-accent/80">
                {messageCustomersModal.unreachable.replace(
                  '{count}',
                  String(recipientsQuery.data.total - recipientsQuery.data.reachable),
                )}
              </p>
            ) : null}
            {pickerOpen && allRecipients ? (
              <ul className="mt-3 max-h-48 space-y-1 overflow-y-auto border-t border-accent/20 pt-2">
                {allRecipients.map((recipient) => {
                  const selectable = recipient.status === 'ok'
                  const checked = selectable && !deselected.includes(recipient.customerId)
                  return (
                    <li key={recipient.customerId}>
                      <label className="flex items-center gap-2 text-xs text-foreground">
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={!selectable}
                          onChange={() =>
                            setDeselected((current) =>
                              current.includes(recipient.customerId)
                                ? current.filter((id) => id !== recipient.customerId)
                                : [...current, recipient.customerId],
                            )
                          }
                          className="h-3.5 w-3.5 rounded border-border text-primary"
                        />
                        <span className="min-w-0 flex-1 truncate">
                          {recipient.customerName} <span className="text-muted">· {recipient.address}</span>
                        </span>
                        {selectable ? null : (
                          <span className="shrink-0 text-muted">
                            {recipient.status === 'opted_out'
                              ? RECIPIENT_STATUS_LABELS.skipped_opted_out
                              : RECIPIENT_STATUS_LABELS.skipped_no_contact}
                          </span>
                        )}
                      </label>
                    </li>
                  )
                })}
              </ul>
            ) : null}
          </section>

          <section>
            <label htmlFor="message-template" className="text-sm font-semibold text-foreground">
              {messageCustomersModal.fields.template}
            </label>
            <Select
              id="message-template"
              inputSize="sm"
              value={templateId}
              onChange={(event) => handleTemplateChange(event.target.value)}
              disabled={templatesQuery.isPending}
              options={[
                {
                  value: '',
                  label: templatesQuery.isPending
                    ? messageCustomersModal.templatesLoading
                    : messageCustomersModal.customTemplate,
                },
                ...templates.map((template) => ({ value: template.id, label: template.name })),
              ]}
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
              placeholder={messageCustomersModal.messagePlaceholder}
              rows={4}
              className="mt-2 bg-card"
            />
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
              <span>{messageCustomersModal.meta.characters.replace('{count}', String(message.length))}</span>
            </div>
          </section>

          <section className="rounded-xl bg-surface px-4 py-3">
            <p className="text-xs font-semibold text-muted">{messageCustomersModal.fields.variables}</p>
            <p className="mt-0.5 text-[11px] text-muted">{messageCustomersModal.variablesHint}</p>
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
              {scheduling ? (
                <div>
                  <label htmlFor="round-message-send-at" className="text-xs font-semibold text-muted">
                    {messageCustomersModal.fields.sendAt}
                  </label>
                  <Input
                    id="round-message-send-at"
                    inputSize="sm"
                    type="datetime-local"
                    value={scheduleAt}
                    onChange={(event) => setScheduleAt(event.target.value)}
                    className="mt-1 bg-card"
                  />
                </div>
              ) : null}
            </div>
          </section>

          <section>
            <p className="text-sm font-semibold text-foreground">{messageCustomersModal.fields.channel}</p>
            <div className="mt-2 inline-flex rounded-xl bg-surface p-1">
              {messageCustomersModal.channels.map((item) => {
                const active = channel === item
                const unavailable = !(item === 'Email' ? channels.email : item === 'SMS' ? channels.sms : channels.whatsapp)

                return (
                  <button
                    key={item}
                    type="button"
                    aria-pressed={active}
                    disabled={unavailable}
                    aria-describedby={unavailable ? 'round-message-channel-notes' : undefined}
                    onClick={() => setChannel(item)}
                    className={cn(
                      'rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50',
                      active ? 'bg-primary text-primary-foreground' : 'text-muted hover:text-foreground',
                    )}
                  >
                    {item}
                  </button>
                )
              })}
            </div>
            {channelNotes(channels).length > 0 ? (
              <div id="round-message-channel-notes" className="mt-1.5 space-y-0.5 text-xs text-muted">
                {channelNotes(channels).map((note) => (
                  <p key={note}>{note}</p>
                ))}
              </div>
            ) : null}
          </section>
        </>
      )}
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
