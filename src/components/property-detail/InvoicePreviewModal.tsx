import type { InvoicePreview } from '@/api/invoices.api'
import { propertyDetailContent } from '@/content/property-detail'
import { site } from '@/content/site'
import { DashboardIcon } from '@/components/dashboard/DashboardIcon'
import { dashboardCtaShadowClass } from '@/components/dashboard/dashboard-styles'
import { Modal, ModalButton } from '@/components/ui/modal'
import { useToast } from '@/components/ui/toast'
import {
  formatInvoiceDate,
  formatInvoiceDateLong,
  formatInvoiceMoney,
  formatInvoiceNumber,
  paymentMethodLabel,
  vatPercentLabel,
} from '@/features/invoices/lib/mappers'
import { cn } from '@/lib/utils'

interface InvoicePreviewModalProps {
  open: boolean
  preview: InvoicePreview | undefined
  dueDate?: string
  notes?: string
  generating?: boolean
  sendEmail?: boolean
  onClose: () => void
  onEditDetails: () => void
  onGenerate?: () => void
}

const invoiceCapsClass = 'text-[11px] font-medium uppercase tracking-[0.1em] text-muted/55'
const invoiceMetaClass = 'text-sm font-normal leading-snug text-muted'
const invoiceValueClass = 'text-sm font-normal text-foreground'
const invoiceStrongClass = 'text-sm font-bold text-foreground'
const invoiceRuleClass = 'border-border/55'

/** Invoice document preview — populated from GET /invoices/preview. */
export function InvoicePreviewModal({
  open,
  preview,
  dueDate,
  notes,
  generating = false,
  sendEmail = false,
  onClose,
  onEditDetails,
  onGenerate,
}: InvoicePreviewModalProps) {
  const { invoicePreviewModal, generateInvoiceModal } = propertyDetailContent
  const { showToast } = useToast()

  if (!preview) return null

  const amount = formatInvoiceMoney(preview.total)
  const paymentMethod = paymentMethodLabel(preview.paymentMethod)
  const subtitle = invoicePreviewModal.subtitle
    .replace('{customer}', preview.customer.name)
    .replace('{visitDate}', formatInvoiceDate(preview.visitDate))

  return (
    <Modal
      open={open}
      onClose={generating ? () => undefined : onClose}
      title={invoicePreviewModal.title}
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
            onClick={onEditDetails}
            disabled={generating}
            className="inline-flex items-center gap-1.5 px-1 text-sm font-medium text-muted transition-colors hover:text-foreground disabled:opacity-50"
          >
            <DashboardIcon name="arrow-left" className="h-4 w-4" />
            {invoicePreviewModal.actions.editDetails}
          </button>
          <div className="flex flex-wrap gap-2.5">
            <ModalButton
              compact
              variant="secondary"
              className="gap-2 rounded-lg"
              disabled={generating}
              onClick={() => showToast(invoicePreviewModal.printToast)}
            >
              <DashboardIcon name="print" className="h-4 w-4" />
              {invoicePreviewModal.actions.print}
            </ModalButton>
            {onGenerate ? (
              <ModalButton
                compact
                variant="primary"
                className={`gap-2 rounded-lg ${dashboardCtaShadowClass}`}
                disabled={generating}
                onClick={onGenerate}
              >
                <DashboardIcon name="send" className="h-4 w-4" />
                {generating
                  ? 'Saving…'
                  : sendEmail
                    ? generateInvoiceModal.actions.generate
                    : generateInvoiceModal.actions.draft}
              </ModalButton>
            ) : (
              <ModalButton
                compact
                variant="primary"
                className={`gap-2 rounded-lg ${dashboardCtaShadowClass}`}
                onClick={() => showToast(invoicePreviewModal.downloadToast)}
              >
                <DashboardIcon name="download" className="h-4 w-4" />
                {invoicePreviewModal.actions.downloadPdf}
              </ModalButton>
            )}
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
              {invoicePreviewModal.invoiceHeading}
            </p>
            <p className="mt-0.5 text-sm font-normal text-white/45">
              {formatInvoiceNumber(preview.invoiceNumber)}
            </p>
          </div>
        </div>

        <div className="grid gap-8 px-6 py-6 sm:grid-cols-2">
          <div>
            <p className={invoiceCapsClass}>{invoicePreviewModal.billTo}</p>
            <div className="mt-3 space-y-0.5">
              <p className={invoiceStrongClass}>{preview.customer.name}</p>
              <p className={invoiceMetaClass}>{preview.customer.addressLine}</p>
              {preview.customer.postcode ? (
                <p className={invoiceMetaClass}>{preview.customer.postcode}</p>
              ) : null}
              {preview.customer.email ? (
                <p className={invoiceMetaClass}>{preview.customer.email}</p>
              ) : null}
              {preview.customer.phone ? (
                <p className={invoiceMetaClass}>{preview.customer.phone}</p>
              ) : null}
            </div>
          </div>
          <div className="sm:text-right">
            <p className={invoiceCapsClass}>{invoicePreviewModal.invoiceDetails}</p>
            <dl className="mt-3 space-y-2">
              <DetailRow
                label={invoicePreviewModal.fields.invoiceDate}
                value={formatInvoiceDate(preview.invoiceDate)}
              />
              <DetailRow
                label={invoicePreviewModal.fields.visitDate}
                value={formatInvoiceDate(preview.visitDate)}
              />
              <DetailRow
                label={invoicePreviewModal.fields.dueDate}
                value={formatInvoiceDate(dueDate || preview.dueDate)}
              />
              <DetailRow label={invoicePreviewModal.fields.payment} value={paymentMethod} />
            </dl>
          </div>
        </div>

        <div className={cn('border-t px-6 pt-4 pb-5', invoiceRuleClass)}>
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className={cn('border-b', invoiceRuleClass)}>
                <th className={cn('pb-3 pr-4 text-left font-medium', invoiceCapsClass)}>
                  {invoicePreviewModal.table.description}
                </th>
                <th className={cn('pb-3 pr-4 text-left font-medium', invoiceCapsClass)}>
                  {invoicePreviewModal.table.technician}
                </th>
                <th className={cn('pb-3 text-right font-medium', invoiceCapsClass)}>
                  {invoicePreviewModal.table.amount}
                </th>
              </tr>
            </thead>
            <tbody>
              {preview.lineItems.map((item, index) => (
                <tr key={`${item.description}-${index}`} className={cn('border-b', invoiceRuleClass)}>
                  <td className="py-4 pr-4 align-top">
                    <p className={invoiceStrongClass}>{item.description}</p>
                    <p className={cn('mt-1 text-xs', invoiceMetaClass)}>
                      {formatInvoiceDateLong(preview.visitDate)}
                    </p>
                  </td>
                  <td className={cn('py-4 pr-4 align-top', invoiceValueClass)}>
                    {item.technicianName || '—'}
                  </td>
                  <td className={cn('py-4 text-right align-top', invoiceStrongClass)}>
                    {formatInvoiceMoney(item.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-4 flex justify-end">
            <dl className="w-full max-w-[220px] space-y-2">
              <TotalRow
                label={invoicePreviewModal.totals.subtotal}
                value={formatInvoiceMoney(preview.subtotal)}
              />
              <TotalRow label={vatPercentLabel(preview)} value={formatInvoiceMoney(preview.vatAmount)} />
              <div className={cn('flex items-center justify-between border-t pt-3', invoiceRuleClass)}>
                <dt className="text-sm font-bold text-foreground">{invoicePreviewModal.totals.totalDue}</dt>
                <dd className="text-base font-bold text-foreground">{amount}</dd>
              </div>
            </dl>
          </div>
        </div>

        {notes?.trim() ? (
          <p className={cn('border-t px-6 py-3 text-sm text-muted', invoiceRuleClass)}>{notes.trim()}</p>
        ) : null}

        <p className={cn('border-t px-6 py-4 text-center text-xs font-normal text-muted/55', invoiceRuleClass)}>
          {preview.business.name}
          {preview.business.email ? ` · ${preview.business.email}` : ''}
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
