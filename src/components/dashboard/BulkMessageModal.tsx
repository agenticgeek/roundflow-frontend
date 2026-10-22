import { useEffect, useMemo, useState } from 'react'
import { dashboardContent } from '@/content/dashboard'
import { Field, Select, Textarea } from '@/components/ui'
import { Modal, ModalButton } from '@/components/ui/modal'
import { useToast } from '@/components/ui/toast'
import { useBulkMessage } from '@/features/messages/hooks/useMessages'
import { useRounds } from '@/features/rounds/hooks/useRounds'
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

function formatCurrency(amount: number) {
  return `£${amount.toFixed(2)}`
}

/** Bulk SMS composer — opened from the sidebar quick action. */
export function BulkMessageModal({ open, onClose }: BulkMessageModalProps) {
  const { bulkMessageModal } = dashboardContent
  const { fields, sendOptions, actions, templates, creditPricePerSms } = bulkMessageModal
  const { showToast } = useToast()
  const { canMutate } = useAppBootstrap()
  const bulkMessage = useBulkMessage()
  const roundsQuery = useRounds('ACTIVE', open)

  // Real rounds (the content rounds were placeholders with fake ids).
  const rounds = useMemo(
    () =>
      (roundsQuery.data ?? []).map((round) => ({
        id: round.id,
        label: round.name,
        propertyCount: round.propertyCount,
      })),
    [roundsQuery.data],
  )

  const [roundId, setRoundId] = useState('')
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? '')
  const [excludeOnHold, setExcludeOnHold] = useState(true)
  const [sendOption, setSendOption] = useState<SendOptionId>('now')

  useEffect(() => {
    if (!open) return
    setTemplateId(templates[0]?.id ?? '')
    setExcludeOnHold(true)
    setSendOption('now')
  }, [open, templates])

  // Default to the first real round once they load (or when the selection is gone).
  useEffect(() => {
    if (!open) return
    if (!roundId || !rounds.some((round) => round.id === roundId)) {
      setRoundId(rounds[0]?.id ?? '')
    }
  }, [open, rounds, roundId])

  const selectedRound = rounds.find((round) => round.id === roundId) ?? rounds[0]
  const selectedTemplate = templates.find((template) => template.id === templateId) ?? templates[0]

  // Estimate only — the final, deduped, hold-filtered count comes back from the server.
  const recipientCount = selectedRound?.propertyCount ?? 0

  const totalCredits = recipientCount * (selectedTemplate?.smsCreditsPerCustomer ?? 1)
  const totalCost = totalCredits * creditPricePerSms
  const characterCount = selectedTemplate?.body.length ?? 0

  async function handleSend() {
    if (!selectedRound || !selectedTemplate || !canMutate || bulkMessage.isPending) return
    if (sendOption === 'schedule') {
      showToast('Scheduled sends aren’t available yet — choose “Send now”.')
      return
    }
    try {
      const result = await bulkMessage.mutateAsync({
        roundId: selectedRound.id,
        channel: 'sms',
        body: selectedTemplate.body,
        excludePaymentHold: excludeOnHold,
      })
      onClose()
      showToast('Messages sent', {
        description: `Sent to ${result.queued} recipient${result.queued === 1 ? '' : 's'}.`,
      })
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

  if (!selectedTemplate) return null

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
        <div className="grid grid-cols-2 gap-3">
          <ModalButton compact variant="secondary" className="w-full" onClick={onClose}>
            {actions.cancel}
          </ModalButton>
          <ModalButton
            compact
            variant="primary"
            className="w-full"
            disabled={!canMutate || !selectedRound || bulkMessage.isPending}
            onClick={() => void handleSend()}
          >
            {bulkMessage.isPending ? 'Sending…' : actions.send}
          </ModalButton>
        </div>
      }
    >
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
            options={templates.map((template) => ({
              value: template.id,
              label: template.label,
            }))}
          />
        </Field>

        <Field label={fields.preview.label} labelWeight="medium" size="sm">
          <Textarea
            inputSize="sm"
            readOnly
            value={selectedTemplate.body}
            rows={4}
            className="bg-surface text-muted"
          />
          <p className="mt-1.5 text-[11px] text-muted">
            {characterCount} characters • {selectedTemplate.smsCreditsPerCustomer} SMS credit per
            customer
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
          <p>Recipients: {recipientCount} customers</p>
          <p className="mt-1">
            Total cost: {totalCredits} SMS credits ({formatCurrency(totalCost)})
          </p>
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
                  <span
                    className={cn(
                      'text-xs font-medium',
                      active ? 'text-foreground' : 'text-muted',
                    )}
                  >
                    {option.label}
                  </span>
                </label>
              )
            })}
          </div>
        </Field>
      </div>
    </Modal>
  )
}
