import { useEffect, useState } from 'react'
import { InvoicePreviewModal } from '@/components/property-detail/InvoicePreviewModal'
import type { PropertyDetailRecord, PropertyVisitRecord } from '@/content/property-detail'
import { propertyDetailContent } from '@/content/property-detail'
import { DashboardIcon } from '@/components/dashboard/DashboardIcon'
import { Field, Input, Textarea } from '@/components/ui'
import { Modal, ModalButton, modalInfoPanelClass, modalInputClass } from '@/components/ui/modal'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'

interface GenerateInvoiceModalProps {
  open: boolean
  property: PropertyDetailRecord
  visit: PropertyVisitRecord | null
  onClose: () => void
}

function formatAmount(price: string) {
  const numeric = price.replace(/[£,\s]/g, '')
  if (!numeric) return '£0.00'
  return `£${Number(numeric).toFixed(2)}`
}

function propertyStreet(address: string) {
  return address.split(',')[0]?.trim() ?? address
}

function paymentMethodLabel(property: PropertyDetailRecord) {
  if (!property.paymentMethod || property.paymentMethod === '—') {
    return propertyDetailContent.generateInvoiceModal.paymentMethod.defaultMethod
  }
  return property.paymentMethod
}

/** Generate invoice for a completed visit — opened from Visit History. */
export function GenerateInvoiceModal({ open, property, visit, onClose }: GenerateInvoiceModalProps) {
  const { generateInvoiceModal } = propertyDetailContent
  const { showToast } = useToast()
  const [invoiceNumber, setInvoiceNumber] = useState<string>(generateInvoiceModal.defaultInvoiceNumber)
  const [notes, setNotes] = useState('')
  const [sendEmail, setSendEmail] = useState(true)
  const [previewOpen, setPreviewOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    setInvoiceNumber(generateInvoiceModal.defaultInvoiceNumber)
    setNotes('')
    setSendEmail(true)
    setPreviewOpen(false)
  }, [generateInvoiceModal.defaultInvoiceNumber, open, visit?.id])

  if (!visit) return null

  const paymentMethod = paymentMethodLabel(property)
  const subtitle = generateInvoiceModal.subtitle
    .replace('{customer}', property.customerName)
    .replace('{visitDate}', visit.visitDate)

  function handleGenerate() {
    onClose()
    showToast(generateInvoiceModal.successToast)
  }

  function handlePreview() {
    setPreviewOpen(true)
  }

  function handleCloseAll() {
    setPreviewOpen(false)
    onClose()
  }

  return (
    <>
      <Modal
        open={open && !previewOpen}
        onClose={handleCloseAll}
      title={generateInvoiceModal.title}
      subtitle={subtitle}
      showCloseButton
      stacked
      size="compact"
      maxWidthClass="max-w-xl"
      headerClassName="pl-16"
      bodyClassName="space-y-4"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleCloseAll}
            className="px-1 text-sm font-semibold text-muted transition-colors hover:text-foreground"
          >
            {generateInvoiceModal.actions.cancel}
          </button>
          <div className="flex flex-wrap gap-2">
            <ModalButton compact variant="secondary" className="gap-2" onClick={handlePreview}>
              <DashboardIcon name="file" className="h-4 w-4" />
              {generateInvoiceModal.actions.preview}
            </ModalButton>
            <ModalButton compact variant="primary" className="gap-2" onClick={handleGenerate}>
              <DashboardIcon name="send" className="h-4 w-4" />
              {generateInvoiceModal.actions.generate}
            </ModalButton>
          </div>
        </div>
      }
    >
      <span className="absolute top-4 left-5 flex h-9 w-9 items-center justify-center rounded-none bg-accent-surface text-accent">
        <DashboardIcon name="file" className="h-5 w-5" />
      </span>

      <div className={cn(modalInfoPanelClass, 'grid gap-4 sm:grid-cols-2')}>
        <SummaryItem
          icon="user"
          label={generateInvoiceModal.summary.customer}
          value={property.customerName}
        />
        <SummaryItem
          icon="map-pin"
          label={generateInvoiceModal.summary.property}
          value={propertyStreet(property.fullAddress)}
        />
        <SummaryItem
          icon="calendar"
          label={generateInvoiceModal.summary.visitDate}
          value={visit.visitDate}
        />
        <SummaryItem
          icon="card"
          label={generateInvoiceModal.summary.amount}
          value={formatAmount(visit.price)}
        />
        <SummaryItem
          icon="mail"
          label={generateInvoiceModal.summary.customerEmail}
          value={property.email}
          className="sm:col-span-2"
        />
      </div>

      <Field
        label={
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden="true">#</span>
            {generateInvoiceModal.fields.invoiceNumber}
          </span>
        }
        size="sm"
        labelWeight="medium"
      >
        <Input
          inputSize="sm"
          value={invoiceNumber}
          onChange={(event) => setInvoiceNumber(event.target.value)}
          className={cn(modalInputClass, 'rounded-lg bg-card')}
        />
      </Field>

      <Field
        label={
          <span className="inline-flex items-center gap-1.5">
            <DashboardIcon name="message" className="h-4 w-4 text-muted" />
            {generateInvoiceModal.fields.notes}
          </span>
        }
        size="sm"
        labelWeight="medium"
      >
        <Textarea
          inputSize="sm"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder={generateInvoiceModal.fields.notesPlaceholder}
          className={cn(modalInputClass, 'min-h-24 rounded-lg bg-card')}
        />
      </Field>

      <div className={cn(modalInfoPanelClass, 'flex gap-3 text-sm')}>
        <DashboardIcon name="card" className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <div>
          <p className="font-semibold text-primary">
            {generateInvoiceModal.paymentMethod.label.replace('{method}', paymentMethod)}
          </p>
          <p className="mt-0.5 text-primary/80">
            {generateInvoiceModal.paymentMethod.description.replace('{method}', paymentMethod)}
          </p>
        </div>
      </div>

      <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-border px-4 py-3">
        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={sendEmail}
            onChange={(event) => setSendEmail(event.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary/20"
          />
          <div>
            <p className="text-sm font-semibold text-foreground">{generateInvoiceModal.email.label}</p>
            <p className="mt-0.5 text-xs text-muted">{property.email}</p>
          </div>
        </div>
        <DashboardIcon name="mail" className="h-4 w-4 shrink-0 text-muted" />
      </label>
      </Modal>

      <InvoicePreviewModal
        open={open && previewOpen}
        property={property}
        visit={visit}
        invoiceNumber={invoiceNumber}
        onClose={handleCloseAll}
        onEditDetails={() => setPreviewOpen(false)}
      />
    </>
  )
}

function SummaryItem({
  icon,
  label,
  value,
  className,
}: {
  icon: string
  label: string
  value: string
  className?: string
}) {
  return (
    <div className={cn('flex gap-3', className)}>
      <DashboardIcon name={icon} className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
      <div className="min-w-0">
        <p className="text-[11px] font-semibold tracking-wide text-muted uppercase">{label}</p>
        <p className="mt-0.5 text-sm font-semibold text-foreground">{value}</p>
      </div>
    </div>
  )
}
