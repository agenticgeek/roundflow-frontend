import type { DebtCustomerRecord } from '@/content/debt-payment'
import { debtPaymentContent } from '@/content/debt-payment'
import { site } from '@/content/site'
import { DashboardIcon } from '@/components/dashboard/DashboardIcon'
import { dashboardCtaShadowClass } from '@/components/dashboard/dashboard-styles'
import { Modal, ModalButton } from '@/components/ui/modal'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'

interface DebtInvoicePreviewModalProps {
  open: boolean
  record: DebtCustomerRecord | null
  onClose: () => void
}

const invoiceCapsClass = 'text-[11px] font-medium uppercase tracking-[0.1em] text-muted/55'
const invoiceMetaClass = 'text-sm font-normal leading-snug text-muted'
const invoiceValueClass = 'text-sm font-normal text-foreground'
const invoiceStrongClass = 'text-sm font-bold text-foreground'
const invoiceRuleClass = 'border-border/55'

function formatAmount(amount: string) {
  const numeric = amount.replace(/[£,\s]/g, '')
  if (!numeric) return '£0.00'
  return `£${Number(numeric).toFixed(2)}`
}

function splitAddress(address: string) {
  const parts = address.split(',').map((part) => part.trim())
  if (parts.length >= 2) {
    return {
      street: parts.slice(0, -1).join(', '),
      postcode: parts[parts.length - 1],
    }
  }
  return { street: address, postcode: '' }
}

function invoiceNumberFor(record: DebtCustomerRecord) {
  const suffix = String(Math.abs(record.amountValue * 3 + record.customer.length)).padStart(3, '0')
  return `${debtPaymentContent.invoiceModal.invoiceNumberPrefix}${suffix}`
}

/** Invoice document preview for a debt board customer. */
export function DebtInvoicePreviewModal({ open, record, onClose }: DebtInvoicePreviewModalProps) {
  const { invoiceModal } = debtPaymentContent
  const { showToast } = useToast()

  if (!record) return null

  const amount = formatAmount(record.amountOwed)
  const { street, postcode } = splitAddress(record.address)
  const visitDate = record.recentVisits[0]?.date ?? record.invoiceDate
  const invoiceNumber = invoiceNumberFor(record)
  const subtitle = invoiceModal.subtitle
    .replace('{customer}', record.customer)
    .replace('{invoiceDate}', record.invoiceDate)

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={invoiceModal.title}
      subtitle={subtitle}
      showCloseButton
      stacked
      size="compact"
      maxWidthClass="max-w-[720px]"
      className="max-h-[min(92dvh,44rem)] overflow-hidden rounded-2xl"
      headerClassName="pl-16"
      footerClassName="py-4"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 px-1 text-sm font-medium text-muted transition-colors hover:text-foreground"
          >
            <DashboardIcon name="arrow-left" className="h-4 w-4" />
            {invoiceModal.actions.cancel}
          </button>
          <div className="flex flex-wrap gap-2.5">
            <ModalButton
              compact
              variant="secondary"
              className="gap-2 rounded-lg"
              onClick={() => showToast(invoiceModal.printToast)}
            >
              <DashboardIcon name="print" className="h-4 w-4" />
              {invoiceModal.actions.print}
            </ModalButton>
            <ModalButton
              compact
              variant="primary"
              className={cn('gap-2 rounded-lg', dashboardCtaShadowClass)}
              onClick={() => {
                showToast(invoiceModal.downloadToast)
                onClose()
              }}
            >
              <DashboardIcon name="download" className="h-4 w-4" />
              {invoiceModal.actions.downloadPdf}
            </ModalButton>
          </div>
        </div>
      }
    >
      <span className="absolute top-4 left-5 flex h-9 w-9 items-center justify-center rounded-lg bg-accent-surface text-accent">
        <DashboardIcon name="file" className="h-5 w-5" />
      </span>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between bg-[#1F1F1F] px-6 py-5">
          <img src="/assets/logo_roundflow_dark.svg" alt={site.logo.alt} className="h-8 w-auto" />
          <div className="text-right">
            <p className="text-[26px] font-bold tracking-[0.18em] text-white">
              {invoiceModal.invoiceHeading}
            </p>
            <p className="mt-0.5 text-sm font-normal text-white/45">{invoiceNumber}</p>
          </div>
        </div>

        <div className="grid gap-8 px-6 py-6 sm:grid-cols-2">
          <div>
            <p className={invoiceCapsClass}>{invoiceModal.billTo}</p>
            <div className="mt-3 space-y-0.5">
              <p className={invoiceStrongClass}>{record.customer}</p>
              <p className={invoiceMetaClass}>{street}</p>
              {postcode ? <p className={invoiceMetaClass}>{postcode}</p> : null}
              <p className={invoiceMetaClass}>{record.email}</p>
              <p className={invoiceMetaClass}>{record.phone}</p>
            </div>
          </div>
          <div className="sm:text-right">
            <p className={invoiceCapsClass}>{invoiceModal.invoiceDetails}</p>
            <dl className="mt-3 space-y-2">
              <DetailRow label={invoiceModal.fields.invoiceDate} value={record.invoiceDate} />
              <DetailRow label={invoiceModal.fields.visitDate} value={visitDate} />
              <DetailRow label={invoiceModal.fields.dueDate} value={record.invoiceDate} />
              <DetailRow label={invoiceModal.fields.payment} value={record.paymentMethod} />
            </dl>
          </div>
        </div>

        <div className={cn('border-t px-6 pt-4 pb-5', invoiceRuleClass)}>
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className={cn('border-b', invoiceRuleClass)}>
                <th className={cn('pb-3 pr-4 text-left font-medium', invoiceCapsClass)}>
                  {invoiceModal.table.description}
                </th>
                <th className={cn('pb-3 pr-4 text-left font-medium', invoiceCapsClass)}>
                  {invoiceModal.table.technician}
                </th>
                <th className={cn('pb-3 text-right font-medium', invoiceCapsClass)}>
                  {invoiceModal.table.amount}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className={cn('border-b', invoiceRuleClass)}>
                <td className="py-4 pr-4 align-top">
                  <p className={invoiceStrongClass}>{invoiceModal.serviceTitle}</p>
                  <p className={cn('mt-1 text-xs', invoiceMetaClass)}>
                    {invoiceModal.serviceSubtitle
                      .replace('{round}', record.round)
                      .replace('{visitDate}', visitDate)}
                  </p>
                </td>
                <td className={cn('py-4 pr-4 align-top', invoiceValueClass)}>
                  {invoiceModal.defaultTechnician}
                </td>
                <td className={cn('py-4 text-right align-top', invoiceStrongClass)}>{amount}</td>
              </tr>
            </tbody>
          </table>

          <div className="mt-4 flex justify-end">
            <dl className="w-full max-w-[220px] space-y-2">
              <TotalRow label={invoiceModal.totals.subtotal} value={amount} />
              <TotalRow label={invoiceModal.totals.vat} value="£0.00" />
              <div className={cn('flex items-center justify-between border-t pt-3', invoiceRuleClass)}>
                <dt className="text-sm font-bold text-foreground">{invoiceModal.totals.totalDue}</dt>
                <dd className="text-base font-bold text-foreground">{amount}</dd>
              </div>
            </dl>
          </div>
        </div>

        <p className={cn('border-t px-6 py-4 text-center text-xs font-normal text-muted/55', invoiceRuleClass)}>
          {invoiceModal.footer}
        </p>
      </div>
    </Modal>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-end gap-6 text-sm sm:gap-8">
      <dt className="font-normal text-muted/70">{label}</dt>
      <dd className={cn('min-w-[5.5rem] text-right', invoiceValueClass)}>{value}</dd>
    </div>
  )
}

function TotalRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <dt className="font-normal text-muted/70">{label}</dt>
      <dd className={invoiceValueClass}>{value}</dd>
    </div>
  )
}
