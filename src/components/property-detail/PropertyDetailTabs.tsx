import { useState } from 'react'
import { MarkInvoicePaidModal } from '@/components/invoices/MarkInvoicePaidModal'
import { GenerateInvoiceModal } from '@/components/property-detail/GenerateInvoiceModal'
import { MarkPaymentPaidButton } from '@/components/property-detail/MarkPaymentPaidButton'
import { PinnedPropertyNotes } from '@/components/property-detail/PinnedPropertyNotes'
import { SavedInvoiceModal } from '@/components/property-detail/SavedInvoiceModal'
import type {
  PropertyDetailRecord,
  PropertyNoteCategory,
  PropertyNoteRecord,
  PropertyPaymentRecord,
  PropertyVisitRecord,
  PaymentRecordStatus,
  VisitPaymentStatus,
  VisitStatus,
} from '@/content/property-detail'
import { paymentRecordToVisitRecord, propertyDetailContent } from '@/content/property-detail'
import { DashboardIcon } from '@/components/dashboard/DashboardIcon'
import { dashboardCtaClass } from '@/components/dashboard/dashboard-styles'
import { Textarea } from '@/components/ui'
import { Pager } from '@/components/ui/pager'
import { useToast } from '@/components/ui/toast'
import { sharedActionsContent } from '@/content/shared-actions'
import { useCustomerVisits } from '@/features/customer-records/hooks/useCustomerRecords'
import { canGenerateInvoice, customerVisitsToRecords } from '@/features/customer-records/lib/visits'
import { categoryToNoteType } from '@/features/customers/lib/mappers'
import { useCustomerInvoices } from '@/features/invoices/hooks/useInvoices'
import { applyCustomerInvoicesToVisits } from '@/features/invoices/lib/mappers'
import { useAddPropertyNote, usePropertyNotes } from '@/features/properties/hooks/useProperties'
import { pinnedFromProperty, splitPropertyNotes } from '@/features/properties/lib/notes'
import { errorMessage } from '@/lib/errors'
import { useAppBootstrap } from '@/providers/AppBootstrapProvider'
import { cn } from '@/lib/utils'

const visitStatusClass: Record<VisitStatus, string> = {
  completed: 'bg-success/10 text-success',
  scheduled: 'bg-accent-surface text-accent',
  'in-progress': 'bg-primary/10 text-primary',
  skipped: 'bg-warning-surface text-warning-foreground',
  cancelled: 'bg-muted/15 text-muted',
  'cancelled-paused': 'bg-muted/15 text-muted',
}

const visitPaymentClass: Record<VisitPaymentStatus, string> = {
  paid: 'bg-success/10 text-success',
  pending: 'bg-warning-surface text-warning-foreground',
}

interface VisitHistoryTabProps {
  property: PropertyDetailRecord
  /** Fallback rows (the customer detail's visitHistory) when no customer id is known. */
  visits?: PropertyVisitRecord[]
  /** Loads GET /customers/:id/visits — every status incl. cancelled (GAP-020). */
  customerId?: string
}

/** Visit history table — from property detail tabs. */
export function VisitHistoryTab({ property, visits: visitsProp, customerId = '' }: VisitHistoryTabProps) {
  const { visitHistory } = propertyDetailContent
  const { canMutate } = useAppBootstrap()
  const [page, setPage] = useState(1)
  const visitsQuery = useCustomerVisits(customerId, page, Boolean(customerId))
  const invoicesQuery = useCustomerInvoices(customerId, Boolean(customerId) && canMutate)
  const visits = visitsQuery.data
    ? applyCustomerInvoicesToVisits(customerVisitsToRecords(visitsQuery.data.rows), invoicesQuery.data)
    : (visitsProp ?? [])
  const [invoiceVisit, setInvoiceVisit] = useState<PropertyVisitRecord | null>(null)
  const [viewInvoiceId, setViewInvoiceId] = useState<string | null>(null)

  return (
    <>
      <h2 className="text-base font-semibold text-foreground">{visitHistory.title}</h2>

      {customerId && visitsQuery.isPending ? (
        <p className="mt-5 text-sm text-muted" aria-busy="true">
          {visitHistory.loading}
        </p>
      ) : customerId && visitsQuery.isError ? (
        <div role="alert" className="mt-5 text-sm">
          <p className="font-semibold text-foreground">{visitHistory.loadError}</p>
          <p className="mt-1 text-muted">{errorMessage(visitsQuery.error)}</p>
          <button
            type="button"
            onClick={() => void visitsQuery.refetch()}
            className="mt-2 font-semibold text-primary underline"
          >
            {visitHistory.retry}
          </button>
        </div>
      ) : visits.length === 0 ? (
        <p className="mt-5 text-sm text-muted">{visitHistory.emptyLabel}</p>
      ) : (
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[820px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-surface/80">
                {Object.values(visitHistory.columns).map((label) => (
                  <th key={label} className="px-4 py-3 font-semibold text-muted">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visits.map((visit) => (
                <VisitHistoryRow
                  key={visit.id}
                  visit={visit}
                  canMutate={canMutate}
                  onGenerate={() => setInvoiceVisit(visit)}
                  onView={() => visit.invoiceId && setViewInvoiceId(visit.invoiceId)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
      {visitsQuery.data && visitsQuery.data.pagination.totalPages > 1 ? (
        <Pager pagination={visitsQuery.data.pagination} loading={visitsQuery.isFetching} onPage={setPage} />
      ) : null}

      <GenerateInvoiceModal
        open={invoiceVisit !== null}
        property={property}
        visit={invoiceVisit}
        onClose={() => setInvoiceVisit(null)}
      />
      <SavedInvoiceModal
        open={viewInvoiceId !== null}
        invoiceId={viewInvoiceId}
        customerName={property.customerName}
        address={property.fullAddress}
        email={property.email}
        phone={property.phone}
        paymentMethod={property.paymentMethod}
        onClose={() => setViewInvoiceId(null)}
      />
    </>
  )
}

function VisitHistoryRow({
  visit,
  canMutate,
  onGenerate,
  onView,
}: {
  visit: PropertyVisitRecord
  canMutate: boolean
  onGenerate: () => void
  onView: () => void
}) {
  const { visitHistory } = propertyDetailContent

  return (
    <tr className="border-b border-border last:border-b-0">
      <td className="px-4 py-3.5 text-foreground">{visit.visitDate}</td>
      <td className="px-4 py-3.5 text-foreground">{visit.round}</td>
      <td className="px-4 py-3.5 text-foreground">{visit.technician}</td>
      <td className="px-4 py-3.5">
        <StatusBadge
          label={visitHistory.statusLabels[visit.status]}
          className={visitStatusClass[visit.status]}
        />
      </td>
      <td className="px-4 py-3.5">
        <StatusBadge
          label={visitHistory.paymentLabels[visit.payment]}
          className={visitPaymentClass[visit.payment]}
        />
      </td>
      <td className="px-4 py-3.5 text-foreground">{visit.price}</td>
      <td className="px-4 py-3.5">
        {canGenerateInvoice(visit) && canMutate ? (
          <button
            type="button"
            onClick={onGenerate}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground underline underline-offset-2 transition-colors hover:text-primary"
          >
            <DashboardIcon name="file" className="h-4 w-4" />
            {visitHistory.invoiceActions.generate}
          </button>
        ) : visit.invoice === 'draft' ? (
          <button
            type="button"
            onClick={onView}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-warning-foreground underline underline-offset-2"
          >
            <DashboardIcon name="file" className="h-4 w-4" />
            {visitHistory.invoiceActions.draft}
          </button>
        ) : visit.invoice === 'sent' ? (
          <button
            type="button"
            onClick={onView}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-success underline underline-offset-2"
          >
            <DashboardIcon name="check-circle" className="h-4 w-4" />
            {visitHistory.invoiceActions.sent}
          </button>
        ) : (
          <span className="text-muted">—</span>
        )}
      </td>
    </tr>
  )
}

function StatusBadge({ label, className }: { label: string; className: string }) {
  return (
    <span className={cn('inline-flex rounded-md px-2 py-0.5 text-xs font-semibold capitalize', className)}>
      {label}
    </span>
  )
}

const paymentStatusClass: Record<PaymentRecordStatus, string> = {
  paid: 'bg-success/10 text-success',
  unpaid: 'bg-warning-surface text-warning-foreground',
}

const paymentDotClass: Record<PaymentRecordStatus, string> = {
  paid: 'bg-success',
  unpaid: 'bg-warning',
}

interface PaymentsTabProps {
  property: PropertyDetailRecord
  /** `undefined` = use mock fallback; empty array = loaded with no rows; omit financials when parent passes nothing for TECHNICIAN via sentinel. */
  payments?: PropertyPaymentRecord[] | null
}

/** Payment history table — visits, invoices, and actions. */
export function PaymentsTab({ property, payments: paymentsProp }: PaymentsTabProps) {
  const { paymentHistory } = propertyDetailContent
  const { canMutate } = useAppBootstrap()
  const payments = paymentsProp ?? []
  const [invoiceVisit, setInvoiceVisit] = useState<PropertyVisitRecord | null>(null)
  const [viewInvoiceId, setViewInvoiceId] = useState<string | null>(null)
  const [markPaidRow, setMarkPaidRow] = useState<PropertyPaymentRecord | null>(null)
  const visitsTotal = paymentHistory.visitsTotal.replace('{count}', String(payments.length))
  const hiddenForRole = paymentsProp === null

  return (
    <>
      <h2 className="text-base font-semibold text-foreground">{paymentHistory.title}</h2>

      {hiddenForRole ? (
        <p className="mt-5 text-sm text-muted">Payment history is not available for your role.</p>
      ) : payments.length === 0 ? (
        <p className="mt-5 text-sm text-muted">{paymentHistory.emptyLabel}</p>
      ) : (
        <div className="mt-5 overflow-hidden rounded-lg border border-border">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h3 className="text-sm font-semibold text-foreground">{paymentHistory.panelTitle}</h3>
            <span className="text-sm text-muted">{visitsTotal}</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-surface/80">
                  {Object.values(paymentHistory.columns).map((label) => (
                    <th key={label} className="px-4 py-3 font-semibold text-muted">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <PaymentHistoryRow
                    key={payment.id}
                    payment={payment}
                    canMutate={canMutate}
                    onView={() => payment.invoiceId && setViewInvoiceId(payment.invoiceId)}
                    onGenerate={() => setInvoiceVisit(paymentRecordToVisitRecord(payment))}
                    onMarkPaid={() => setMarkPaidRow(payment)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <GenerateInvoiceModal
        open={invoiceVisit !== null}
        property={property}
        visit={invoiceVisit}
        onClose={() => setInvoiceVisit(null)}
      />
      <SavedInvoiceModal
        open={viewInvoiceId !== null}
        invoiceId={viewInvoiceId}
        customerName={property.customerName}
        address={property.fullAddress}
        email={property.email}
        phone={property.phone}
        paymentMethod={property.paymentMethod}
        onClose={() => setViewInvoiceId(null)}
      />
      {markPaidRow?.invoiceId ? (
        <MarkInvoicePaidModal
          invoice={{
            id: markPaidRow.invoiceId,
            invoiceNumber: markPaidRow.invoiceNumber ?? markPaidRow.visitDate,
            amountLabel: markPaidRow.amount,
            customerName: property.customerName,
          }}
          onClose={() => setMarkPaidRow(null)}
        />
      ) : null}
    </>
  )
}

function PaymentHistoryRow({
  payment,
  canMutate,
  onView,
  onGenerate,
  onMarkPaid,
}: {
  payment: PropertyPaymentRecord
  canMutate: boolean
  onView: () => void
  onGenerate: () => void
  onMarkPaid: () => void
}) {
  const { paymentHistory } = propertyDetailContent

  return (
    <tr className="border-b border-border last:border-b-0">
      <td className="px-4 py-4">
        <p className="font-semibold text-foreground">{payment.visitDate}</p>
        <p className="mt-0.5 text-xs text-muted">{payment.round}</p>
      </td>
      <td className="px-4 py-4 text-foreground">{payment.technician}</td>
      <td className="px-4 py-4 font-semibold text-foreground">{payment.amount}</td>
      <td className="px-4 py-4">
        <PaymentStatusBadge
          label={paymentHistory.paymentLabels[payment.payment]}
          status={payment.payment}
        />
      </td>
      <td className="px-4 py-4">
        {payment.invoice === 'sent' ? (
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-success">
            <DashboardIcon name="check-circle" className="h-4 w-4" />
            {payment.invoiceNumber ?? paymentHistory.invoiceLabels.sent}
          </span>
        ) : payment.invoice === 'draft' ? (
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-warning-foreground">
            <DashboardIcon name="file" className="h-4 w-4" />
            {payment.invoiceNumber ?? paymentHistory.invoiceLabels.draft}
          </span>
        ) : (
          <span className="text-muted">—</span>
        )}
      </td>
      <td className="px-4 py-4 text-muted">{payment.transactionId ?? '—'}</td>
      <td className="px-4 py-4">
        {payment.invoiceId && payment.payment === 'unpaid' && canMutate ? (
          // GAP-027 part 2: an unpaid invoice is settled via POST /invoices/:id/mark-paid.
          <div className="mb-1.5">
            <button
              type="button"
              onClick={onMarkPaid}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-success underline underline-offset-2"
            >
              <DashboardIcon name="check-circle" className="h-4 w-4" />
              {sharedActionsContent.markPaid.action}
            </button>
          </div>
        ) : payment.markPaidPaymentId && canMutate ? (
          <div className="mb-1.5">
            <MarkPaymentPaidButton paymentId={payment.markPaidPaymentId} amount={payment.amount} />
          </div>
        ) : null}
        {payment.action === 'download' && payment.invoiceId ? (
          <button
            type="button"
            onClick={onView}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-foreground"
          >
            <DashboardIcon name="file" className="h-4 w-4" />
            {paymentHistory.actions.download}
          </button>
        ) : payment.action === 'generate' && canMutate ? (
          <button
            type="button"
            onClick={onGenerate}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground underline underline-offset-2 transition-colors hover:text-primary"
          >
            <DashboardIcon name="file" className="h-4 w-4" />
            {paymentHistory.actions.generate}
          </button>
        ) : (
          <span className="text-muted">—</span>
        )}
      </td>
    </tr>
  )
}

function PaymentStatusBadge({ label, status }: { label: string; status: PaymentRecordStatus }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold',
        paymentStatusClass[status],
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', paymentDotClass[status])} />
      {label}
    </span>
  )
}

interface NotesRiskTabProps {
  property: PropertyDetailRecord
  notes?: PropertyNoteRecord[]
  customerId?: string
}

const noteCategoryPillClass: Record<PropertyNoteCategory, { base: string; selected: string }> = {
  internal: {
    base: 'border-border bg-card text-foreground',
    selected: 'border-sidebar bg-sidebar text-sidebar-foreground',
  },
  risk: {
    base: 'border-danger bg-card text-danger',
    selected: 'border-danger bg-danger/10 text-danger',
  },
  customer: {
    base: 'border-primary bg-card text-primary',
    selected: 'border-primary bg-primary/10 text-primary',
  },
  technician: {
    base: 'border-warning bg-card text-warning',
    selected: 'border-warning bg-warning-surface text-warning-foreground',
  },
}

/** Notes & risk information — add notes and view history. */
export function NotesRiskTab({ property, notes: notesProp, customerId }: NotesRiskTabProps) {
  const { notesRisk } = propertyDetailContent
  const { showToast } = useToast()
  const { canMutate } = useAppBootstrap()
  const addNote = useAddPropertyNote(property.id)
  // GAP-022 part 2: GET /properties/:id/notes lists the pinned access / risk notes first.
  const notesQuery = usePropertyNotes(property.id)
  const serverNotes = notesQuery.data ? splitPropertyNotes(notesQuery.data) : null
  const notes = serverNotes?.notes ?? notesProp ?? []
  const pinned = serverNotes?.pinned ?? pinnedFromProperty(property.accessNotes, property.riskNotes)
  const [formOpen, setFormOpen] = useState(false)
  const [category, setCategory] = useState<PropertyNoteCategory>('internal')
  const [draft, setDraft] = useState('')
  const canSave = draft.trim().length > 0

  const attribution = notesRisk.attribution
    .replace('{author}', notesRisk.defaultAuthor)
    .replace('{date}', notesRisk.attributionDate)

  function closeForm() {
    setFormOpen(false)
    setDraft('')
    setCategory('internal')
  }

  async function handleSave() {
    if (!canSave || !canMutate || addNote.isPending) return

    try {
      await addNote.mutateAsync({
        type: categoryToNoteType(category),
        body: draft.trim(),
      })
      closeForm()
      showToast(notesRisk.saveToast)
      void customerId
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Could not save note')
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-foreground">{notesRisk.title}</h2>
        {!formOpen ? (
          <button type="button" onClick={() => setFormOpen(true)} className={dashboardCtaClass}>
            <DashboardIcon name="plus" className="h-4 w-4" />
            {notesRisk.addNote}
          </button>
        ) : null}
      </div>

      {formOpen ? (
        <div className="mt-5 rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-foreground">{notesRisk.newNote}</p>
            <button
              type="button"
              onClick={closeForm}
              aria-label="Close new note form"
              className="flex h-7 w-7 items-center justify-center text-muted transition-colors hover:text-foreground"
            >
              <DashboardIcon name="x-mark" className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {notesRisk.categories.map((option) => {
              const selected = category === option.id
              const styles = noteCategoryPillClass[option.id as PropertyNoteCategory]

              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setCategory(option.id as PropertyNoteCategory)}
                  className={cn(
                    'rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors',
                    selected ? styles.selected : styles.base,
                  )}
                >
                  {option.label}
                </button>
              )
            })}
          </div>

          <Textarea
            inputSize="sm"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={notesRisk.placeholder}
            className="mt-4 min-h-28 rounded-lg border-border bg-card"
          />

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted">{attribution}</p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={closeForm}
                className="px-3 py-2 text-sm font-semibold text-muted transition-colors hover:text-foreground"
              >
                {notesRisk.actions.cancel}
              </button>
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={!canSave || !canMutate || addNote.isPending}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition-colors',
                  canSave && canMutate && !addNote.isPending
                    ? 'bg-primary text-primary-foreground hover:opacity-90'
                    : 'cursor-not-allowed bg-muted/40 text-primary-foreground',
                )}
              >
                <DashboardIcon name="plus" className="h-4 w-4" />
                {notesRisk.actions.save}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <PinnedPropertyNotes pinned={pinned} />

      <div className={cn('space-y-4', formOpen ? 'mt-4' : 'mt-5')}>
        {notes.map((note) => (
          <NoteCard key={note.id} note={note} />
        ))}
      </div>
    </>
  )
}

function NoteCard({ note }: { note: PropertyNoteRecord }) {
  const { notesRisk } = propertyDetailContent

  return (
    <article className="rounded-lg border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="inline-flex items-center gap-2">
          <DashboardIcon name="file" className="h-4 w-4 text-muted" />
          <h3 className="text-sm font-semibold text-foreground">
            {notesRisk.categoryLabels[note.category]}
          </h3>
        </div>
        <p className="text-xs text-muted">Added on {note.addedOn}</p>
      </div>
      <p className="mt-3 text-sm text-foreground">{note.body}</p>
      <p className="mt-3 text-xs text-muted">By {note.author}</p>
    </article>
  )
}

interface TabPlaceholderProps {
  label: string
}

export function TabPlaceholder({ label }: TabPlaceholderProps) {
  const message = propertyDetailContent.placeholders[label as keyof typeof propertyDetailContent.placeholders]
  return <p className="text-sm text-muted">{message}</p>
}
