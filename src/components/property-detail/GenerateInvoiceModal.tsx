import { useEffect, useState } from 'react'
import { InvoicePreviewModal } from '@/components/property-detail/InvoicePreviewModal'
import type { PropertyDetailRecord, PropertyVisitRecord } from '@/content/property-detail'
import { propertyDetailContent } from '@/content/property-detail'
import { DashboardIcon } from '@/components/dashboard/DashboardIcon'
import { Field, Input, Textarea } from '@/components/ui'
import { Modal, ModalButton, modalInfoPanelClass, modalInputClass } from '@/components/ui/modal'
import { useToast } from '@/components/ui/toast'
import { useCreateInvoice, useInvoicePreview } from '@/features/invoices/hooks/useInvoices'
import {
  defaultDueDateIso,
  formatInvoiceDate,
  formatInvoiceMoney,
  paymentMethodLabel,
} from '@/features/invoices/lib/mappers'
import { useAppBootstrap } from '@/providers/AppBootstrapProvider'
import { ApiError } from '@/lib/errors'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { SkeletonLine } from '@/components/ui/skeleton-cards'

interface GenerateInvoiceModalProps {
  open: boolean
  property: PropertyDetailRecord
  visit: PropertyVisitRecord | null
  onClose: () => void
}

function propertyStreet(address: string) {
  return address.split(',')[0]?.trim() ?? address
}

/** Generate invoice for a completed visit — GET preview then POST /invoices. */
export function GenerateInvoiceModal({ open, property, visit, onClose }: GenerateInvoiceModalProps) {
  const { generateInvoiceModal } = propertyDetailContent
  const { showToast } = useToast()
  const { canMutate } = useAppBootstrap()
  const visitId = visit?.id ?? ''
  const previewQuery = useInvoicePreview(visitId, open && Boolean(visitId))
  const createInvoice = useCreateInvoice()

  const [notes, setNotes] = useState('')
  const [dueDate, setDueDate] = useState(defaultDueDateIso())
  const [sendEmail, setSendEmail] = useState(true)
  const [previewOpen, setPreviewOpen] = useState(false)

  const preview = previewQuery.data
  const customerEmail = preview?.customer.email?.trim() || property.email?.trim() || ''
  const canEmail = Boolean(customerEmail)

  useEffect(() => {
    if (!open) return
    setNotes('')
    setDueDate(defaultDueDateIso())
    setSendEmail(Boolean(property.email?.trim()))
    setPreviewOpen(false)
  }, [open, property.email, visit?.id])

  useEffect(() => {
    if (!canEmail) setSendEmail(false)
  }, [canEmail])

  if (!visit) return null

  const alreadyInvoiced =
    previewQuery.isError &&
    previewQuery.error instanceof ApiError &&
    previewQuery.error.status === 409

  const amount = preview ? formatInvoiceMoney(preview.total) : visit.price
  const paymentMethod = paymentMethodLabel(
    preview?.paymentMethod ?? (property.paymentMethod !== '—' ? property.paymentMethod : null),
  )
  const subtitle = generateInvoiceModal.subtitle
    .replace('{customer}', preview?.customer.name ?? property.customerName)
    .replace(
      '{visitDate}',
      preview ? formatInvoiceDate(preview.visitDate) : visit.visitDate,
    )

  async function handleGenerate() {
    if (!canMutate || !visit || createInvoice.isPending) return
    try {
      const result = await createInvoice.mutateAsync({
        visitId: visit.id,
        dueDate: dueDate || null,
        notes: notes.trim() || null,
        sendEmail: sendEmail && canEmail,
      })
      onClose()
      showToast(
        result.status === 'SENT'
          ? generateInvoiceModal.successToast
          : generateInvoiceModal.draftToast,
      )
    } catch (error) {
      if (error instanceof ApiError && (error.status === 400 || error.status === 404 || error.status === 409)) {
        showToast(error.message)
        return
      }
      showToast(error instanceof Error ? error.message : 'Could not generate invoice')
    }
  }

  function handleCloseAll() {
    if (createInvoice.isPending) return
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
              disabled={createInvoice.isPending}
              className="px-1 text-sm font-semibold text-muted transition-colors hover:text-foreground disabled:opacity-50"
            >
              {generateInvoiceModal.actions.cancel}
            </button>
            <div className="flex flex-wrap gap-2">
              <ModalButton
                compact
                variant="secondary"
                className="gap-2"
                disabled={previewQuery.isPending || alreadyInvoiced || !preview}
                onClick={() => setPreviewOpen(true)}
              >
                <DashboardIcon name="file" className="h-4 w-4" />
                {generateInvoiceModal.actions.preview}
              </ModalButton>
              <ModalButton
                compact
                variant="primary"
                className="gap-2"
                disabled={
                  !canMutate ||
                  createInvoice.isPending ||
                  previewQuery.isPending ||
                  alreadyInvoiced ||
                  !preview
                }
                onClick={() => void handleGenerate()}
              >
                <DashboardIcon name="send" className="h-4 w-4" />
                {createInvoice.isPending
                  ? 'Saving…'
                  : sendEmail && canEmail
                    ? generateInvoiceModal.actions.generate
                    : generateInvoiceModal.actions.draft}
              </ModalButton>
            </div>
          </div>
        }
      >
        <span className="absolute top-4 left-5 flex h-9 w-9 items-center justify-center rounded-none bg-accent-surface text-accent">
          <DashboardIcon name="file" className="h-5 w-5" />
        </span>

        {previewQuery.isPending ? (
          <GenerateInvoiceSkeleton />
        ) : alreadyInvoiced ? (
          <p className="rounded-lg border border-warning-border bg-warning-surface px-4 py-3 text-sm text-warning-foreground">
            {generateInvoiceModal.alreadyExists}
          </p>
        ) : previewQuery.isError ? (
          <div className="rounded-lg border border-border bg-surface px-4 py-3 text-sm text-muted">
            <p>
              {previewQuery.error instanceof Error
                ? previewQuery.error.message
                : 'Could not load invoice preview.'}
            </p>
            <button
              type="button"
              className="mt-2 text-sm font-semibold underline"
              onClick={() => void previewQuery.refetch()}
            >
              Retry
            </button>
          </div>
        ) : (
          <>
            <div className={cn(modalInfoPanelClass, 'grid gap-4 sm:grid-cols-2')}>
              <SummaryItem
                icon="user"
                label={generateInvoiceModal.summary.customer}
                value={preview?.customer.name ?? property.customerName}
              />
              <SummaryItem
                icon="map-pin"
                label={generateInvoiceModal.summary.property}
                value={preview?.customer.addressLine ?? propertyStreet(property.fullAddress)}
              />
              <SummaryItem
                icon="calendar"
                label={generateInvoiceModal.summary.visitDate}
                value={preview ? formatInvoiceDate(preview.visitDate) : visit.visitDate}
              />
              <SummaryItem
                icon="card"
                label={generateInvoiceModal.summary.amount}
                value={amount}
              />
              <SummaryItem
                icon="mail"
                label={generateInvoiceModal.summary.customerEmail}
                value={customerEmail || '—'}
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
                value={preview?.invoiceNumber ?? ''}
                readOnly
                className={cn(modalInputClass, 'rounded-lg bg-surface text-muted')}
              />
            </Field>

            <Field label={generateInvoiceModal.fields.dueDate} size="sm" labelWeight="medium">
              <Input
                type="date"
                inputSize="sm"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
                disabled={createInvoice.isPending}
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
                disabled={createInvoice.isPending}
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
                  checked={sendEmail && canEmail}
                  disabled={!canEmail || createInvoice.isPending}
                  onChange={(event) => setSendEmail(event.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary/20 disabled:opacity-50"
                />
                <div>
                  <p className="text-sm font-semibold text-foreground">{generateInvoiceModal.email.label}</p>
                  <p className="mt-0.5 text-xs text-muted">
                    {canEmail ? customerEmail : generateInvoiceModal.noEmailWarning}
                  </p>
                </div>
              </div>
              <DashboardIcon name="mail" className="h-4 w-4 shrink-0 text-muted" />
            </label>
          </>
        )}
      </Modal>

      <InvoicePreviewModal
        open={open && previewOpen && Boolean(preview)}
        preview={preview}
        dueDate={dueDate}
        notes={notes}
        onClose={handleCloseAll}
        onEditDetails={() => setPreviewOpen(false)}
        onGenerate={() => void handleGenerate()}
        generating={createInvoice.isPending}
        sendEmail={sendEmail && canEmail}
      />
    </>
  )
}

function GenerateInvoiceSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading invoice preview">
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 5 }, (_, index) => (
          <div key={index} className="space-y-2">
            <SkeletonLine className="w-20" />
            <SkeletonLine className="w-32" />
          </div>
        ))}
      </div>
      <Skeleton className="h-10 w-full rounded-lg" />
      <Skeleton className="h-10 w-full rounded-lg" />
      <Skeleton className="h-24 w-full rounded-lg" />
    </div>
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
