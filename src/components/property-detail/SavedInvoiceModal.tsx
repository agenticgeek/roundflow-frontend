import type { InvoiceRecord } from '@/api/invoices.api'
import { propertyDetailContent } from '@/content/property-detail'
import { site } from '@/content/site'
import { DashboardIcon } from '@/components/dashboard/DashboardIcon'
import { dashboardCtaShadowClass } from '@/components/dashboard/dashboard-styles'
import { InvoiceSendPanel } from '@/components/property-detail/InvoiceSendPanel'
import { Modal, ModalButton } from '@/components/ui/modal'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toast'
import type { PaymentMethod } from '@/api/types'
import { PAYMENT_METHOD_LABELS } from '@/features/customers/lib/mappers'
import { useInvoice, useInvoicePdf } from '@/features/invoices/hooks/useInvoices'
import {
  formatInvoiceDate,
  formatInvoiceMoney,
  formatInvoiceNumber,
} from '@/features/invoices/lib/mappers'
import { downloadBlob, printBlob } from '@/lib/download'
import { useAppBootstrap } from '@/providers/AppBootstrapProvider'
import { cn } from '@/lib/utils'

interface SavedInvoiceModalProps {
  open: boolean
  invoiceId: string | null
  customerName: string
  address?: string
  email?: string
  phone?: string
  paymentMethod?: string
  visitDate?: string
  technician?: string
  onClose: () => void
}

const invoiceCapsClass = 'text-[11px] font-medium uppercase tracking-[0.1em] text-muted/55'
const invoiceMetaClass = 'text-sm font-normal leading-snug text-muted'
const invoiceValueClass = 'text-sm font-normal text-foreground'
const invoiceStrongClass = 'text-sm font-bold text-foreground'
const invoiceRuleClass = 'border-border/55'

/**
 * Existing invoice — GET /invoices/:id. An unpaid one can be sent on a chosen channel
 * (POST /invoices/:id/send, GAP-034) or marked paid (GAP-027) from the panel above it.
 */
export function SavedInvoiceModal({
  open,
  invoiceId,
  customerName,
  address,
  email,
  phone,
  paymentMethod,
  visitDate,
  technician,
  onClose,
}: SavedInvoiceModalProps) {
  const { invoicePreviewModal } = propertyDetailContent
  const { showToast } = useToast()
  const { canMutate } = useAppBootstrap()
  const invoiceQuery = useInvoice(invoiceId ?? '', open && Boolean(invoiceId))
  const pdf = useInvoicePdf()
  const invoice = invoiceQuery.data

  async function getPdf(): Promise<Blob | null> {
    if (!invoice || pdf.isPending) return null
    try {
      return await pdf.mutateAsync(invoice.id)
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Could not generate the PDF')
      return null
    }
  }

  async function handleDownload() {
    const blob = await getPdf()
    if (blob && invoice) {
      downloadBlob(blob, `${formatInvoiceNumber(invoice.invoiceNumber)}.pdf`)
    }
  }

  async function handlePrint() {
    const blob = await getPdf()
    if (blob && invoice) {
      printBlob(blob, `${formatInvoiceNumber(invoice.invoiceNumber)}.pdf`)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={invoicePreviewModal.title}
      subtitle={
        invoice
          ? `${customerName} · ${formatInvoiceNumber(invoice.invoiceNumber)}`
          : customerName
      }
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
            className="inline-flex items-center gap-1.5 px-1 text-sm font-medium text-muted transition-colors hover:text-foreground disabled:opacity-50"
          >
            <DashboardIcon name="arrow-left" className="h-4 w-4" />
            Close
          </button>
          <div className="flex flex-wrap gap-2.5">
            <ModalButton
              compact
              variant="secondary"
              className="gap-2 rounded-lg"
              disabled={!invoice || pdf.isPending}
              onClick={() => void handlePrint()}
            >
              <DashboardIcon name="print" className="h-4 w-4" />
              {invoicePreviewModal.actions.print}
            </ModalButton>
            <ModalButton
              compact
              variant="primary"
              className={cn('gap-2 rounded-lg', dashboardCtaShadowClass)}
              disabled={!invoice || pdf.isPending}
              onClick={() => void handleDownload()}
            >
              <DashboardIcon name="download" className="h-4 w-4" />
              {pdf.isPending ? 'Preparing…' : invoicePreviewModal.actions.downloadPdf}
            </ModalButton>
          </div>
        </div>
      }
    >
      <span className="absolute top-4 left-5 flex h-9 w-9 items-center justify-center rounded-lg bg-accent-surface text-accent">
        <DashboardIcon name="file" className="h-5 w-5" />
      </span>

      {invoiceQuery.isPending ? (
        <div className="space-y-4" aria-busy="true" aria-label="Loading invoice">
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      ) : invoiceQuery.isError ? (
        <div className="rounded-lg border border-border bg-surface px-4 py-3 text-sm text-muted">
          <p>
            {invoiceQuery.error instanceof Error
              ? invoiceQuery.error.message
              : 'Could not load invoice.'}
          </p>
          <button
            type="button"
            className="mt-2 text-sm font-semibold underline"
            onClick={() => void invoiceQuery.refetch()}
          >
            Retry
          </button>
        </div>
      ) : invoice ? (
        <div className="space-y-4">
          {canMutate && invoice.status !== 'PAID' ? (
            <InvoiceSendPanel invoice={invoice} customerName={customerName} />
          ) : null}
          <InvoiceDocument
          invoice={invoice}
          customerName={customerName}
          address={address}
          email={email}
          phone={phone}
          paymentMethod={paymentMethod}
          visitDate={visitDate}
          technician={technician}
          />
        </div>
      ) : null}
    </Modal>
  )
}

function InvoiceDocument({
  invoice,
  customerName,
  address,
  email,
  phone,
  paymentMethod,
  visitDate,
  technician,
}: {
  invoice: InvoiceRecord
  customerName: string
  address?: string
  email?: string
  phone?: string
  paymentMethod?: string
  visitDate?: string
  technician?: string
}) {
  const { invoicePreviewModal } = propertyDetailContent
  const amount = formatInvoiceMoney(invoice.amount)
  // The invoice's own data wins; the props (from the property page) fill in for an older
  // backend whose GET /invoices/:id doesn't carry them yet.
  const billTo = invoice.customer
  const billName = billTo?.name || customerName
  const billAddress =
    [billTo?.addressLine, billTo?.postcode].filter(Boolean).join(', ') || address
  const billEmail = billTo?.email || email
  const billPhone = billTo?.phone || phone
  const invoiceVisitDate = invoice.visitDate ?? visitDate
  const invoiceTechnician = invoice.technicianName ?? technician
  const invoicePayment = invoice.paymentMethod
    ? (PAYMENT_METHOD_LABELS[invoice.paymentMethod as PaymentMethod] ?? invoice.paymentMethod)
    : paymentMethod
  const lineItems = invoice.lineItems?.length
    ? invoice.lineItems
    : [{ description: invoicePreviewModal.serviceTitle, technicianName: invoiceTechnician ?? null, amount: invoice.amount }]
  const hasBreakdown = invoice.subtotal != null && invoice.vatAmount != null

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between bg-[#1F1F1F] px-6 py-5">
        <img src="/assets/logo_roundflow_dark.svg" alt={site.logo.alt} className="h-8 w-auto" />
        <div className="text-right">
          <p className="text-[26px] font-bold tracking-[0.18em] text-white">
            {invoicePreviewModal.invoiceHeading}
          </p>
          <p className="mt-0.5 text-sm font-normal text-white/45">
            {formatInvoiceNumber(invoice.invoiceNumber)}
          </p>
        </div>
      </div>

      <div className="grid gap-8 px-6 py-6 sm:grid-cols-2">
        <div>
          <p className={invoiceCapsClass}>{invoicePreviewModal.billTo}</p>
          <div className="mt-3 space-y-0.5">
            <p className={invoiceStrongClass}>{billName}</p>
            {billAddress ? <p className={invoiceMetaClass}>{billAddress}</p> : null}
            {billEmail ? <p className={invoiceMetaClass}>{billEmail}</p> : null}
            {billPhone ? <p className={invoiceMetaClass}>{billPhone}</p> : null}
          </div>
        </div>
        <div className="sm:text-right">
          <p className={invoiceCapsClass}>{invoicePreviewModal.invoiceDetails}</p>
          <dl className="mt-3 space-y-2">
            <DetailRow
              label={invoicePreviewModal.fields.invoiceDate}
              value={formatInvoiceDate(invoice.createdAt)}
            />
            <DetailRow
              label={invoicePreviewModal.fields.visitDate}
              value={invoiceVisitDate ? formatInvoiceDate(invoiceVisitDate) : '—'}
            />
            <DetailRow
              label={invoicePreviewModal.fields.dueDate}
              value={formatInvoiceDate(invoice.dueDate)}
            />
            <DetailRow
              label={invoicePreviewModal.fields.payment}
              value={invoicePayment || '—'}
            />
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
            {lineItems.map((item, index) => (
              <tr key={`${item.description}-${index}`} className={cn('border-b', invoiceRuleClass)}>
                <td className="py-4 pr-4 align-top">
                  <p className={invoiceStrongClass}>{item.description}</p>
                  <p className={cn('mt-1 text-xs', invoiceMetaClass)}>
                    {invoice.status} · {formatInvoiceDate(invoice.createdAt)}
                  </p>
                </td>
                <td className={cn('py-4 pr-4 align-top', invoiceValueClass)}>{item.technicianName || '—'}</td>
                <td className={cn('py-4 text-right align-top', invoiceStrongClass)}>
                  {formatInvoiceMoney(item.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-4 flex justify-end">
          <dl className="w-full max-w-[220px] space-y-2">
            {hasBreakdown ? (
              <>
                <div className="flex items-center justify-between">
                  <dt className={invoiceMetaClass}>{invoicePreviewModal.totals.subtotal}</dt>
                  <dd className={invoiceValueClass}>{formatInvoiceMoney(invoice.subtotal!)}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className={invoiceMetaClass}>{invoicePreviewModal.totals.vatLabel}</dt>
                  <dd className={invoiceValueClass}>{formatInvoiceMoney(invoice.vatAmount!)}</dd>
                </div>
              </>
            ) : null}
            <div className={cn('flex items-center justify-between border-t pt-3', invoiceRuleClass)}>
              <dt className="text-sm font-bold text-foreground">{invoicePreviewModal.totals.totalDue}</dt>
              <dd className="text-base font-bold text-foreground">{amount}</dd>
            </div>
          </dl>
        </div>
      </div>

      {invoice.notes ? (
        <p className={cn('border-t px-6 py-3 text-sm text-muted', invoiceRuleClass)}>{invoice.notes}</p>
      ) : null}
    </div>
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
