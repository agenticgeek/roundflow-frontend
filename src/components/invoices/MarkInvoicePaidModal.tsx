import { useState } from 'react'
import type { ManualPaymentMethod, MarkInvoicePaidResult } from '@/api/invoices.api'
import { Field, Input, Select } from '@/components/ui'
import { Modal, ModalButton, ModalFooter, modalInfoPanelClass } from '@/components/ui/modal'
import { useToast } from '@/components/ui/toast'
import { sharedActionsContent } from '@/content/shared-actions'
import { useMarkInvoicePaid } from '@/features/invoices/hooks/useInvoiceActions'
import { defaultManualMethod } from '@/features/invoices/lib/manual-method'
import { errorMessage } from '@/lib/errors'
import { todayIso } from '@/lib/round-dates'

export type MarkPaidInvoice = {
  id: string
  invoiceNumber: string
  /** Display amount, e.g. "£20.00". */
  amountLabel?: string
  customerName?: string
  paymentMethod?: string | null
}

/**
 * "Mark as paid" for an invoice paid outside RoundFlow (GAP-027 part 2): method
 * (BACS / cheque / cash), optional reference and the date received, through
 * `POST /invoices/:id/mark-paid`. Mount it only while open so the form starts fresh.
 */
export function MarkInvoicePaidModal({
  invoice,
  onClose,
  onPaid,
}: {
  invoice: MarkPaidInvoice
  onClose: () => void
  onPaid?: (result: MarkInvoicePaidResult) => void
}) {
  const copy = sharedActionsContent.markPaid
  const { showToast } = useToast()
  const markPaid = useMarkInvoicePaid()
  const [method, setMethod] = useState<ManualPaymentMethod>(defaultManualMethod(invoice.paymentMethod))
  const [reference, setReference] = useState('')
  const [paidAt, setPaidAt] = useState(todayIso())
  const [error, setError] = useState<string | null>(null)

  const referenceError = reference.trim().length > 100 ? copy.referenceTooLong : null
  const dateError = paidAt ? null : copy.dateRequired

  async function submit() {
    setError(null)
    try {
      const result = await markPaid.mutateAsync({
        invoiceId: invoice.id,
        input: { method, reference: reference.trim() || null, paidAt },
      })
      showToast(copy.done.replace('{invoice}', invoice.invoiceNumber))
      onPaid?.(result)
      onClose()
    } catch (caught) {
      setError(errorMessage(caught))
    }
  }

  return (
    <Modal
      open
      onClose={markPaid.isPending ? () => undefined : onClose}
      title={copy.title}
      subtitle={copy.subtitle}
      size="compact"
      bodyClassName="space-y-4"
      footer={
        <ModalFooter compact>
          <ModalButton compact onClick={onClose} disabled={markPaid.isPending}>
            {copy.cancel}
          </ModalButton>
          <ModalButton
            compact
            variant="primary"
            loading={markPaid.isPending}
            disabled={Boolean(referenceError || dateError)}
            onClick={() => void submit()}
          >
            {markPaid.isPending ? copy.saving : copy.save}
          </ModalButton>
        </ModalFooter>
      }
    >
      <div className={modalInfoPanelClass}>
        <p className="text-sm font-semibold text-foreground">{invoice.invoiceNumber}</p>
        {invoice.customerName || invoice.amountLabel ? (
          <p className="text-sm text-muted">
            {[invoice.customerName, invoice.amountLabel].filter(Boolean).join(' · ')}
          </p>
        ) : null}
      </div>

      <Field label={copy.methodLabel} size="sm" labelWeight="medium">
        <Select
          inputSize="sm"
          aria-label={copy.methodLabel}
          value={method}
          onChange={(event) => setMethod(event.target.value as ManualPaymentMethod)}
          options={copy.methods.map(({ value, label }) => ({ value, label }))}
          disabled={markPaid.isPending}
        />
      </Field>

      <Field label={copy.referenceLabel} size="sm" labelWeight="medium" error={referenceError}>
        <Input
          inputSize="sm"
          aria-label={copy.referenceLabel}
          placeholder={copy.referencePlaceholder}
          value={reference}
          onChange={(event) => setReference(event.target.value)}
          disabled={markPaid.isPending}
        />
      </Field>

      <Field label={copy.dateLabel} size="sm" labelWeight="medium" error={dateError}>
        <Input
          inputSize="sm"
          type="date"
          aria-label={copy.dateLabel}
          value={paidAt}
          max={todayIso()}
          onChange={(event) => setPaidAt(event.target.value)}
          disabled={markPaid.isPending}
        />
      </Field>

      {error ? (
        <p role="alert" className="text-sm font-semibold text-danger">
          {error}
        </p>
      ) : null}
    </Modal>
  )
}
