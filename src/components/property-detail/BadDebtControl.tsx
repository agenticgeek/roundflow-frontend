import { useState } from 'react'
import { Field, Textarea } from '@/components/ui'
import { Modal, ModalButton, ModalFooter } from '@/components/ui/modal'
import { useToast } from '@/components/ui/toast'
import { propertyDetailContent } from '@/content/property-detail'
import { useSetBadDebt } from '@/features/customer-records/hooks/useCustomerRecords'
import { errorMessage } from '@/lib/errors'

/** The header's "Bad debt" badge (GAP-022). */
export function BadDebtBadge() {
  return (
    <span className="inline-flex rounded-full bg-danger/10 px-3 py-1 text-xs font-semibold text-danger">
      {propertyDetailContent.badDebt.badge}
    </span>
  )
}

/**
 * Flag / clear a customer as bad debt (PATCH /customers/:id/bad-debt). The optional reason is
 * only written to the activity log.
 */
export function BadDebtControl({
  customerId,
  customerName,
  badDebt,
}: {
  customerId: string
  customerName: string
  badDebt: boolean
}) {
  const copy = propertyDetailContent.badDebt
  const { showToast } = useToast()
  const setBadDebt = useSetBadDebt(customerId)
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)

  function close() {
    setOpen(false)
    setReason('')
    setError(null)
  }

  async function confirm() {
    setError(null)
    try {
      await setBadDebt.mutateAsync({ flag: !badDebt, reason: reason.trim() || null })
      showToast((badDebt ? copy.clearedToast : copy.flaggedToast).replace('{customer}', customerName))
      close()
    } catch (caught) {
      setError(errorMessage(caught))
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm font-semibold text-danger underline underline-offset-2"
      >
        {badDebt ? copy.clear : copy.flag}
      </button>
      <Modal
        open={open}
        onClose={setBadDebt.isPending ? () => undefined : close}
        title={badDebt ? copy.clearTitle : copy.flagTitle}
        subtitle={badDebt ? copy.clearDescription : copy.flagDescription}
        size="compact"
        footer={
          <ModalFooter compact>
            <ModalButton compact onClick={close} disabled={setBadDebt.isPending}>
              {copy.cancel}
            </ModalButton>
            <ModalButton
              compact
              variant={badDebt ? 'primary' : 'danger'}
              loading={setBadDebt.isPending}
              onClick={() => void confirm()}
            >
              {setBadDebt.isPending ? copy.saving : badDebt ? copy.confirmClear : copy.confirmFlag}
            </ModalButton>
          </ModalFooter>
        }
      >
        <Field label={copy.reasonLabel} size="sm" labelWeight="medium">
          <Textarea
            inputSize="sm"
            aria-label={copy.reasonLabel}
            placeholder={copy.reasonPlaceholder}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
        </Field>
        {error ? (
          <p role="alert" className="mt-3 text-sm font-semibold text-danger">
            {error}
          </p>
        ) : null}
      </Modal>
    </>
  )
}
