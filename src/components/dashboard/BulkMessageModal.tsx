import { useEffect, useMemo, useState } from 'react'
import { dashboardContent } from '@/content/dashboard'
import { Field, Select, Textarea } from '@/components/ui'
import { Modal, ModalButton } from '@/components/ui/modal'
import { cn } from '@/lib/utils'

interface BulkMessageModalProps {
  open: boolean
  onClose: () => void
}

type SendOptionId = 'now' | 'schedule'

function formatRoundLabel(label: string, customerCount: number) {
  return `${label} (${customerCount} customers)`
}

function formatCurrency(amount: number) {
  return `£${amount.toFixed(2)}`
}

/** Bulk SMS/WhatsApp composer — opened from the sidebar quick action. */
export function BulkMessageModal({ open, onClose }: BulkMessageModalProps) {
  const { bulkMessageModal } = dashboardContent
  const { fields, sendOptions, actions, rounds, templates, creditPricePerSms } = bulkMessageModal

  const [roundId, setRoundId] = useState(rounds[0]?.id ?? '')
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? '')
  const [excludeOnHold, setExcludeOnHold] = useState(true)
  const [sendOption, setSendOption] = useState<SendOptionId>('now')

  useEffect(() => {
    if (!open) return
    setRoundId(rounds[0]?.id ?? '')
    setTemplateId(templates[0]?.id ?? '')
    setExcludeOnHold(true)
    setSendOption('now')
  }, [open, rounds, templates])

  const selectedRound = rounds.find((round) => round.id === roundId) ?? rounds[0]
  const selectedTemplate = templates.find((template) => template.id === templateId) ?? templates[0]

  const recipientCount = useMemo(() => {
    if (!selectedRound) return 0
    return excludeOnHold
      ? Math.max(0, selectedRound.customerCount - selectedRound.customersOnHold)
      : selectedRound.customerCount
  }, [excludeOnHold, selectedRound])

  const totalCredits = recipientCount * (selectedTemplate?.smsCreditsPerCustomer ?? 1)
  const totalCost = totalCredits * creditPricePerSms
  const characterCount = selectedTemplate?.body.length ?? 0

  function handleSend() {
    onClose()
  }

  if (!selectedRound || !selectedTemplate) return null

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
          <ModalButton compact variant="primary" className="w-full" onClick={handleSend}>
            {actions.send}
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
            options={rounds.map((round) => ({
              value: round.id,
              label: formatRoundLabel(round.label, round.customerCount),
            }))}
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
