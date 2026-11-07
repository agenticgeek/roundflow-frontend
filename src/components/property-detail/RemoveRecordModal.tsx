import { useState } from 'react'
import { Modal, ModalButton, modalWarningPanelClass } from '@/components/ui/modal'
import { useToast } from '@/components/ui/toast'
import { recordModalsContent } from '@/content/record-modals'
import { useDeleteCustomer } from '@/features/customers/hooks/useCustomers'
import { useDeleteProperty } from '@/features/properties/hooks/useProperties'
import { useAppBootstrap } from '@/providers/AppBootstrapProvider'
import { formatListMoney } from '@/features/invoices/lib/list'
import { ApiError, errorMessage } from '@/lib/errors'

export type RemoveKind = 'property' | 'customer'

interface RemoveRecordModalProps {
  kind: RemoveKind | null
  propertyId: string
  customerId: string
  customerName: string
  address: string
  /** Formatted outstanding balance, e.g. "£120" — a non-zero amount shows the unpaid warning. */
  outstandingBalance: string
  onClose: () => void
  /** Called after the record was cancelled — the caller navigates away. */
  onRemoved: () => void
}

/** Confirm before soft-cancelling a property or customer; warns when money is still owed. */
export function RemoveRecordModal({
  kind,
  propertyId,
  customerId,
  customerName,
  address,
  outstandingBalance,
  onClose,
  onRemoved,
}: RemoveRecordModalProps) {
  const copy = recordModalsContent.remove
  const { showToast } = useToast()
  const { canMutate } = useAppBootstrap()
  const removeProperty = useDeleteProperty()
  const removeCustomer = useDeleteCustomer()
  const pending = removeProperty.isPending || removeCustomer.isPending
  const [unpaid, setUnpaid] = useState<{ count?: number; total?: number } | null>(null)
  const owed = Number(outstandingBalance.replace(/[^0-9.]/g, '')) > 0

  async function handleConfirm() {
    if (!kind || !canMutate || pending) return
    setUnpaid(null)
    try {
      if (kind === 'property') await removeProperty.mutateAsync(propertyId)
      else await removeCustomer.mutateAsync(customerId)
      onClose()
      showToast(kind === 'property' ? copy.propertyToast : copy.customerToast)
      onRemoved()
    } catch (caught) {
      // 409 UNPAID_INVOICES carries `count` and `total`: explain it here, next to the button that was pressed.
      const detail = caught instanceof ApiError && caught.code === 'UNPAID_INVOICES' ? (caught.body as { count?: number; total?: number }) : null
      if (detail?.count) setUnpaid(detail)
      else showToast(errorMessage(caught))
    }
  }

  const body =
    kind === 'customer'
      ? copy.customerBody.replace('{customer}', customerName)
      : copy.propertyBody.replace('{address}', address)

  return (
    <Modal
      open={kind !== null}
      onClose={pending ? () => undefined : onClose}
      title={kind === 'customer' ? copy.customerTitle : copy.propertyTitle}
      size="compact"
      maxWidthClass="max-w-md"
      bodyClassName="space-y-4"
      footer={
        <div className="grid grid-cols-2 gap-3">
          <ModalButton compact variant="secondary" className="w-full" disabled={pending} onClick={onClose}>
            {copy.keep}
          </ModalButton>
          <ModalButton
            compact
            variant="danger"
            className="w-full"
            disabled={!canMutate || pending}
            onClick={() => void handleConfirm()}
          >
            {pending ? copy.confirming : copy.confirm}
          </ModalButton>
        </div>
      }
    >
      <p className="text-sm text-foreground">{body}</p>
      {unpaid ? (
        <p role="alert" className={modalWarningPanelClass}>
          {(unpaid.count === 1 ? copy.unpaidInvoicesOne : copy.unpaidInvoices)
            .replace('{count}', String(unpaid.count))
            .replace('{total}', formatListMoney(unpaid.total ?? 0))}
        </p>
      ) : null}
      {owed && !unpaid ? (
        <p role="alert" className={modalWarningPanelClass}>
          {copy.unpaidWarning.replace('{amount}', outstandingBalance)}
        </p>
      ) : null}
    </Modal>
  )
}
