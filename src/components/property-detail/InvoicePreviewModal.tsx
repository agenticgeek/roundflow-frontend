import type { PropertyDetailRecord, PropertyVisitRecord } from '@/content/property-detail'
import { propertyDetailContent } from '@/content/property-detail'
import { site } from '@/content/site'
import { DashboardIcon } from '@/components/dashboard/DashboardIcon'
import { dashboardCtaShadowClass } from '@/components/dashboard/dashboard-styles'
import { Modal, ModalButton } from '@/components/ui/modal'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'

interface InvoicePreviewModalProps {
  open: boolean
  property: PropertyDetailRecord
  visit: PropertyVisitRecord
  invoiceNumber: string
  onClose: () => void
  onEditDetails: () => void
}

/** Section caps — light gray, medium weight. */
const invoiceCapsClass = 'text-[11px] font-medium uppercase tracking-[0.1em] text-muted/55'
/** Secondary body copy — address, contact, sub-lines. */
const invoiceMetaClass = 'text-sm font-normal leading-snug text-muted'
/** Primary body values — dates, technician, subtotal amounts. */
const invoiceValueClass = 'text-sm font-normal text-foreground'
/** Emphasised labels — customer name, service title, line amount. */
const invoiceStrongClass = 'text-sm font-bold text-foreground'
/** Thin rules between invoice blocks. */
const invoiceRuleClass = 'border-border/55'

function formatAmount(price: string) {
  const numeric = price.replace(/[£,\s]/g, '')
  if (!numeric) return '£0.00'
  return `£${Number(numeric).toFixed(2)}`
}

function formatInvoiceNumber(value: string) {
  return value.startsWith('#') ? value : `#${value}`
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

function formatVisitDateLong(dateStr: string) {
  const [day, month, year] = dateStr.split('/').map(Number)
  if (!day || !month || !year) return dateStr
  return new Date(year, month - 1, day).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function paymentMethodLabel(property: PropertyDetailRecord) {
  if (!property.paymentMethod || property.paymentMethod === '—') {
    return propertyDetailContent.generateInvoiceModal.paymentMethod.defaultMethod
  }
  return property.paymentMethod
}

function technicianName(name: string) {
  return name.includes(' ') ? name : `${name} Smith`
}

function visitSubtitle(round: string, visitDate: string) {
  return propertyDetailContent.invoicePreviewModal.serviceSubtitle
    .replace('{round}', round)
    .replace('{visitDateFormatted}', formatVisitDateLong(visitDate))
}

/** Invoice document preview — opened from Generate Invoice modal. */
export function InvoicePreviewModal({
  open,
  property,
  visit,
  invoiceNumber,
  onClose,
  onEditDetails,
}: InvoicePreviewModalProps) {
  const { invoicePreviewModal } = propertyDetailContent
  const { showToast } = useToast()
  const amount = formatAmount(visit.price)
  const paymentMethod = paymentMethodLabel(property)
  const { street, postcode } = splitAddress(property.fullAddress)
  const subtitle = invoicePreviewModal.subtitle
    .replace('{customer}', property.customerName)
    .replace('{visitDate}', visit.visitDate)

  return (
    <Modal
      open={open}
      onClose={onClose}
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
            className="inline-flex items-center gap-1.5 px-1 text-sm font-medium text-muted transition-colors hover:text-foreground"
          >
            <DashboardIcon name="arrow-left" className="h-4 w-4" />
            {invoicePreviewModal.actions.editDetails}
          </button>
          <div className="flex flex-wrap gap-2.5">
            <ModalButton
              compact
              variant="secondary"
              className="gap-2 rounded-lg"
              onClick={() => showToast(invoicePreviewModal.printToast)}
            >
              <DashboardIcon name="print" className="h-4 w-4" />
              {invoicePreviewModal.actions.print}
            </ModalButton>
            <ModalButton
              compact
              variant="primary"
              className={`gap-2 rounded-lg ${dashboardCtaShadowClass}`}
              onClick={() => showToast(invoicePreviewModal.downloadToast)}
            >
              <DashboardIcon name="download" className="h-4 w-4" />
              {invoicePreviewModal.actions.downloadPdf}
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
              {invoicePreviewModal.invoiceHeading}
            </p>
            <p className="mt-0.5 text-sm font-normal text-white/45">{formatInvoiceNumber(invoiceNumber)}</p>
          </div>
        </div>

        <div className="grid gap-8 px-6 py-6 sm:grid-cols-2">
          <div>
            <p className={invoiceCapsClass}>{invoicePreviewModal.billTo}</p>
            <div className="mt-3 space-y-0.5">
              <p className={invoiceStrongClass}>{property.customerName}</p>
              <p className={invoiceMetaClass}>{street}</p>
              {postcode ? <p className={invoiceMetaClass}>{postcode}</p> : null}
              <p className={invoiceMetaClass}>{property.email}</p>
              <p className={invoiceMetaClass}>{property.phone}</p>
            </div>
          </div>
          <div className="sm:text-right">
            <p className={invoiceCapsClass}>{invoicePreviewModal.invoiceDetails}</p>
            <dl className="mt-3 space-y-2">
              <DetailRow label={invoicePreviewModal.fields.invoiceDate} value={invoicePreviewModal.defaultInvoiceDate} />
              <DetailRow label={invoicePreviewModal.fields.visitDate} value={visit.visitDate} />
              <DetailRow label={invoicePreviewModal.fields.dueDate} value={invoicePreviewModal.defaultDueDate} />
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
              <tr className={cn('border-b', invoiceRuleClass)}>
                <td className="py-4 pr-4 align-top">
                  <p className={invoiceStrongClass}>{invoicePreviewModal.serviceTitle}</p>
                  <p className={cn('mt-1 text-xs', invoiceMetaClass)}>{visitSubtitle(visit.round, visit.visitDate)}</p>
                </td>
                <td className={cn('py-4 pr-4 align-top', invoiceValueClass)}>{technicianName(visit.technician)}</td>
                <td className={cn('py-4 text-right align-top', invoiceStrongClass)}>{amount}</td>
              </tr>
            </tbody>
          </table>

          <div className="mt-4 flex justify-end">
            <dl className="w-full max-w-[220px] space-y-2">
              <TotalRow label={invoicePreviewModal.totals.subtotal} value={amount} />
              <TotalRow label={invoicePreviewModal.totals.vat} value="£0.00" />
              <div className={cn('flex items-center justify-between border-t pt-3', invoiceRuleClass)}>
                <dt className="text-sm font-bold text-foreground">{invoicePreviewModal.totals.totalDue}</dt>
                <dd className="text-base font-bold text-foreground">{amount}</dd>
              </div>
            </dl>
          </div>
        </div>

        <p className={cn('border-t px-6 py-4 text-center text-xs font-normal text-muted/55', invoiceRuleClass)}>
          {invoicePreviewModal.footer}
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
