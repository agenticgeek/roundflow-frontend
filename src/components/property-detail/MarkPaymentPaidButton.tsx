import { useState } from 'react'
import { propertyDetailContent } from '@/content/property-detail'
import { DashboardIcon } from '@/components/dashboard/DashboardIcon'
import { useToast } from '@/components/ui/toast'
import { useMarkPaymentPaid } from '@/features/payments/hooks/usePayments'
import { errorMessage } from '@/lib/errors'

/**
 * "Mark as paid" on a pending bank-transfer / cheque row of the Payments tab (GAP-027).
 * Asks once to confirm, then reconciles the payment; a 409 (already paid, not BACS/cheque)
 * shows the server's message.
 */
export function MarkPaymentPaidButton({ paymentId, amount }: { paymentId: string; amount: string }) {
  const copy = propertyDetailContent.paymentHistory.markPaid
  const { showToast } = useToast()
  const markPaid = useMarkPaymentPaid()
  const [confirming, setConfirming] = useState(false)

  async function confirm() {
    try {
      await markPaid.mutateAsync(paymentId)
      showToast(copy.done.replace('{amount}', amount))
      setConfirming(false)
    } catch (error) {
      showToast(errorMessage(error), { tone: 'error' })
    }
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-success underline underline-offset-2"
      >
        <DashboardIcon name="check-circle" className="h-4 w-4" />
        {copy.action}
      </button>
    )
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-2 text-sm">
      <span className="text-muted">{copy.confirm.replace('{amount}', amount)}</span>
      <button
        type="button"
        onClick={() => void confirm()}
        disabled={markPaid.isPending}
        className="font-semibold text-success disabled:opacity-60"
      >
        {markPaid.isPending ? copy.saving : copy.yes}
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        disabled={markPaid.isPending}
        className="font-semibold text-muted disabled:opacity-60"
      >
        {copy.cancel}
      </button>
    </span>
  )
}
