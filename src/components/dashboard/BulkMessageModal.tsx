import { useEffect, useMemo, useState } from 'react'
import { dashboardContent } from '@/content/dashboard'
import { BroadcastResultPanel } from '@/components/messages/BroadcastResultPanel'
import { Field, Input, Select, Textarea } from '@/components/ui'
import { Modal, ModalButton } from '@/components/ui/modal'
import { useToast } from '@/components/ui/toast'
import type { MessageBulkResult } from '@/api/messages.api'
import { useBulkMessage, useBulkRecipients } from '@/features/messages/hooks/useMessages'
import { futureIsoFromLocal } from '@/features/messages/lib/broadcast-summary'
import { useRounds } from '@/features/rounds/hooks/useRounds'
import { useMessageTemplates } from '@/features/settings/hooks/useSettings'
import { useChannels } from '@/features/messaging/hooks/useChannels'
import { defaultMessageChannel } from '@/features/messaging/lib/channels'
import { ApiError } from '@/lib/errors'
import { useAppBootstrap } from '@/providers/AppBootstrapProvider'
import { cn } from '@/lib/utils'

interface BulkMessageModalProps {
  open: boolean
  onClose: () => void
}

type SendOptionId = 'now' | 'schedule'

function formatRoundLabel(label: string, count: number) {
  return `${label} (${count} ${count === 1 ? 'property' : 'properties'})`
}

/** Bulk SMS composer — opened from the sidebar quick action. Real rounds, templates and recipients. */
export function BulkMessageModal({ open, onClose }: BulkMessageModalProps) {
  const { bulkMessageModal } = dashboardContent
  const { fields, sendOptions, actions } = bulkMessageModal
  const { showToast } = useToast()
  const { canMutate } = useAppBootstrap()
  const bulkMessage = useBulkMessage()
  const roundsQuery = useRounds('ACTIVE', open)
  const templatesQuery = useMessageTemplates(open)

  const rounds = useMemo(
    () =>
      (roundsQuery.data ?? []).map((round) => ({
        id: round.id,
        label: round.name,
        propertyCount: round.propertyCount,
      })),
    [roundsQuery.data],
  )
  const templates = useMemo(() => templatesQuery.data ?? [], [templatesQuery.data])

  const [roundId, setRoundId] = useState('')
  const [templateId, setTemplateId] = useState('')
  const [excludeOnHold, setExcludeOnHold] = useState(true)
  const [sendOption, setSendOption] = useState<SendOptionId>('now')
  const [scheduleAt, setScheduleAt] = useState('')
  const [result, setResult] = useState<MessageBulkResult | null>(null)

  useEffect(() => {
    if (!open) return
    setTemplateId('')
    setExcludeOnHold(true)
    setSendOption('now')
    setScheduleAt('')
    setResult(null)
  }, [open])

  // Default to the first real round once they load (or when the selection is gone).
  useEffect(() => {
    if (!open) return
    if (!roundId || !rounds.some((round) => round.id === roundId)) {
      setRoundId(rounds[0]?.id ?? '')
    }
  }, [open, rounds, roundId])

  // Default to the first template once they load.
  useEffect(() => {
    if (!open) return
    if (!templateId || !templates.some((template) => template.id === templateId)) {
      setTemplateId(templates[0]?.id ?? '')
    }
  }, [open, templates, templateId])

  const messageChannel = defaultMessageChannel(useChannels())
  const selectedRound = rounds.find((round) => round.id === roundId)
  const selectedTemplate = templates.find((template) => template.id === templateId)
  const recipients = useBulkRecipients(
    { roundId: selectedRound?.id ?? '', channel: messageChannel, excludePaymentHold: excludeOnHold },
    open && !result,
  )
  const reachable = recipients.data?.reachable
  const scheduling = sendOption === 'schedule'

  async function handleSend() {
    if (!selectedRound || !selectedTemplate || !canMutate || bulkMessage.isPending) return
    let scheduledFor: string | undefined
    if (scheduling) {
      const iso = futureIsoFromLocal(scheduleAt)
      if (!iso) {
        showToast(bulkMessageModal.scheduleInPast)
        return
      }
      scheduledFor = iso
    }
    try {
      const outcome = await bulkMessage.mutateAsync({
        roundId: selectedRound.id,
        channel: messageChannel,
        body: selectedTemplate.body,
        excludePaymentHold: excludeOnHold,
        templateId: selectedTemplate.id,
        scheduledFor,
      })
      setResult(outcome)
      showToast(scheduling ? 'Messages scheduled' : 'Messages sent')
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

  const templateOptions =
    templates.length === 0
      ? [{ value: '', label: templatesQuery.isPending ? bulkMessageModal.templatesLoading : bulkMessageModal.noTemplates }]
      : templates.map((template) => ({ value: template.id, label: template.name }))

  return (
    <Modal
      open={open}
      onClose={onClose}
      showCloseButton
      size="compact"
      maxWidthClass="max-w-xl"
      title={bulkMessageModal.title}
      subtitle={bulkMessageModal.subtitle}
      bodyClassName="border-t border-border pt-4"
      footer={
        result ? (
          <ModalButton compact variant="primary" className="w-full" onClick={onClose}>
            {actions.done}
          </ModalButton>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <ModalButton compact variant="secondary" className="w-full" onClick={onClose}>
              {actions.cancel}
            </ModalButton>
            <ModalButton
              compact
              variant="primary"
              className="w-full"
              disabled={!canMutate || !selectedRound || !selectedTemplate || bulkMessage.isPending}
              onClick={() => void handleSend()}
            >
              {bulkMessage.isPending ? 'Sending…' : scheduling ? actions.schedule : actions.send}
            </ModalButton>
          </div>
        )
      }
    >
      {result ? (
        <BroadcastResultPanel result={result} notMessagedTitle={bulkMessageModal.result.notMessaged} />
      ) : (
        <div className="space-y-4">
          <Field label={fields.round.label} labelWeight="medium" size="sm">
            <Select
              inputSize="sm"
              value={roundId}
              onChange={(event) => setRoundId(event.target.value)}
              disabled={rounds.length === 0}
              options={
                rounds.length === 0
                  ? [{ value: '', label: roundsQuery.isPending ? 'Loading rounds…' : 'No active rounds' }]
                  : rounds.map((round) => ({
                      value: round.id,
                      label: formatRoundLabel(round.label, round.propertyCount),
                    }))
              }
            />
          </Field>

          <Field label={fields.template.label} labelWeight="medium" size="sm">
            <Select
              inputSize="sm"
              value={templateId}
              onChange={(event) => setTemplateId(event.target.value)}
              disabled={templates.length === 0}
              options={templateOptions}
            />
          </Field>

          <Field label={fields.preview.label} labelWeight="medium" size="sm">
            <Textarea
              inputSize="sm"
              readOnly
              value={selectedTemplate?.body ?? ''}
              rows={4}
              className="bg-surface text-muted"
            />
            <p className="mt-1.5 text-[11px] text-muted">
              {(selectedTemplate?.body.length ?? 0)} characters · {bulkMessageModal.variablesHint}
            </p>
          </Field>

          <label className="flex cursor-pointer items-center gap-2.5">
            <input
              type="checkbox"
              checked={excludeOnHold}
              onChange={(event) => setExcludeOnHold(event.target.checked)}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary/20"
            />
            <span className="text-xs font-medium text-foreground">{fields.excludeHold.label}</span>
          </label>

          <div className="rounded-xl border border-accent/25 bg-accent-surface px-3.5 py-3 text-xs font-medium text-accent">
            <p>
              Recipients: {recipients.isError ? 'unavailable' : reachable === undefined ? '…' : `${reachable} customers`}
            </p>
            {recipients.data && recipients.data.total > recipients.data.reachable ? (
              <p className="mt-1 font-normal">
                {recipients.data.total - recipients.data.reachable} more won’t be messaged (opted out or no mobile number)
              </p>
            ) : null}
          </div>

          <Field label={fields.sendOptions.label} labelWeight="medium" size="sm">
            <div className="flex flex-wrap gap-4">
              {sendOptions.map((option) => {
                const active = sendOption === option.id

                return (
                  <label key={option.id} className="inline-flex cursor-pointer items-center gap-2">
                    <input
                      type="radio"
                      name="bulk-message-send-option"
                      value={option.id}
                      checked={active}
                      onChange={() => setSendOption(option.id as SendOptionId)}
                      className="h-4 w-4 border-border text-primary focus:ring-primary/20"
                    />
                    <span className={cn('text-xs font-medium', active ? 'text-foreground' : 'text-muted')}>
                      {option.label}
                    </span>
                  </label>
                )
              })}
            </div>
          </Field>

          {scheduling ? (
            <div>
              <label htmlFor="bulk-message-send-at" className="text-xs font-medium text-muted">
                {fields.sendAt.label}
              </label>
              <Input
                id="bulk-message-send-at"
                inputSize="sm"
                type="datetime-local"
                value={scheduleAt}
                onChange={(event) => setScheduleAt(event.target.value)}
                className="mt-1"
              />
            </div>
          ) : null}
        </div>
      )}
    </Modal>
  )
}
