import type { DebtCustomerRecord } from '@/content/debt-payment'
import { SavedInvoiceModal } from '@/components/property-detail/SavedInvoiceModal'

interface DebtInvoicePreviewModalProps {
  open: boolean
  record: DebtCustomerRecord | null
  onClose: () => void
}

/** Debt board invoice preview — GET /invoices/:id. */
export function DebtInvoicePreviewModal({ open, record, onClose }: DebtInvoicePreviewModalProps) {
  return (
    <SavedInvoiceModal
      open={open && Boolean(record)}
      invoiceId={record?.invoiceId ?? record?.id ?? null}
      customerName={record?.customer ?? ''}
      address={record?.address}
      email={record?.email !== '—' ? record?.email : undefined}
      phone={record?.phone !== '—' ? record?.phone : undefined}
      paymentMethod={record?.paymentMethod}
      onClose={onClose}
    />
  )
}
