import { useState } from 'react'
import type { InvoiceListFilters, InvoiceListRow } from '@/api/invoices.api'
import type { PaymentListFilters } from '@/api/payments.api'
import { MarkInvoicePaidModal } from '@/components/invoices/MarkInvoicePaidModal'
import { SendInvoiceModal } from '@/components/invoices/SendInvoiceModal'
import { SavedInvoiceModal } from '@/components/property-detail/SavedInvoiceModal'
import { Input, Select } from '@/components/ui'
import { Pager } from '@/components/ui/pager'
import { SkeletonTableRows } from '@/components/ui/skeleton-cards'
import { useToast } from '@/components/ui/toast'
import { invoicesContent, type InvoicesTab } from '@/content/invoices'
import { useExportCsv, useInvoiceList, usePaymentList } from '@/features/invoices/hooks/useInvoiceLists'
import {
  compactFilters,
  exportFilename,
  formatListDate,
  formatListMoney,
  isOpenInvoice,
  optionLabel,
  statusTone,
  type ChipTone,
} from '@/features/invoices/lib/list'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { downloadBlob } from '@/lib/download'
import { errorMessage } from '@/lib/errors'
import { todayIso } from '@/lib/round-dates'
import { cn } from '@/lib/utils'
import { useAppBootstrap } from '@/providers/AppBootstrapProvider'

const copy = invoicesContent

const chipClass: Record<ChipTone, string> = {
  neutral: 'bg-surface text-muted',
  info: 'bg-accent-surface text-primary',
  success: 'bg-success/10 text-success',
  danger: 'bg-danger/10 text-danger',
  warning: 'bg-warning-surface text-warning-foreground',
}

function StatusChip({ status, options }: { status: string; options: readonly { value: string; label: string }[] }) {
  return (
    <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-semibold', chipClass[statusTone(status)])}>
      {optionLabel(options, status)}
    </span>
  )
}

const thClass = 'px-3 py-2 text-left text-xs font-semibold text-muted'
const tdClass = 'px-3 py-2.5 text-sm text-foreground'
const linkButtonClass = 'text-sm font-semibold text-primary underline-offset-2 hover:underline'

function ListState({ error, empty, onRetry }: { error: unknown; empty: string; onRetry: () => void }) {
  if (error) {
    return (
      <div role="alert" className="px-5 py-10 text-center text-sm">
        <p className="font-semibold text-foreground">{copy.loadError}</p>
        <p className="mt-1 text-muted">{errorMessage(error)}</p>
        <button type="button" className={cn(linkButtonClass, 'mt-3')} onClick={onRetry}>
          {copy.actions.retry}
        </button>
      </div>
    )
  }
  return <p className="px-5 py-10 text-center text-sm text-muted">{empty}</p>
}

function DateFilters({ from, to, onFrom, onTo }: { from: string; to: string; onFrom: (v: string) => void; onTo: (v: string) => void }) {
  return (
    <>
      <Input inputSize="sm" type="date" aria-label={copy.filters.from} value={from} onChange={(e) => onFrom(e.target.value)} className="w-auto rounded-lg" />
      <Input inputSize="sm" type="date" aria-label={copy.filters.to} value={to} onChange={(e) => onTo(e.target.value)} className="w-auto rounded-lg" />
    </>
  )
}

function useCsvExport() {
  const exportCsv = useExportCsv()
  const { showToast } = useToast()
  async function run(request: Parameters<typeof exportCsv.mutateAsync>[0]) {
    try {
      const blob = await exportCsv.mutateAsync(request)
      downloadBlob(blob, exportFilename(request.kind, todayIso()))
      showToast(copy.exportDone)
    } catch (error) {
      showToast(errorMessage(error), { tone: 'error' })
    }
  }
  return { run, pending: exportCsv.isPending }
}

type InvoiceModal = { kind: 'preview' | 'send' | 'mark-paid'; row: InvoiceListRow } | null

function InvoicesPanel() {
  const { canMutate } = useAppBootstrap()
  const [status, setStatus] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [search, setSearch] = useState('')
  const q = useDebouncedValue(search.trim(), 300)
  const filters = compactFilters({ status, from, to, q }) as InvoiceListFilters
  const filterKey = JSON.stringify(filters)
  const [pageState, setPageState] = useState({ key: filterKey, page: 1 })
  const page = pageState.key === filterKey ? pageState.page : 1
  const list = useInvoiceList({ ...filters, page })
  const csv = useCsvExport()
  const [modal, setModal] = useState<InvoiceModal>(null)

  const rows = list.data?.rows ?? []
  const customerName = (row: InvoiceListRow) => row.customer.name ?? copy.noValue

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          inputSize="sm"
          aria-label={copy.filters.search}
          placeholder={copy.filters.searchPlaceholder}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="w-64 rounded-lg"
        />
        <Select
          inputSize="sm"
          aria-label={copy.filters.status}
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          options={[...copy.invoiceStatuses]}
        />
        <DateFilters from={from} to={to} onFrom={setFrom} onTo={setTo} />
        <button
          type="button"
          className="ml-auto rounded-lg border border-border px-3 py-2 text-sm font-semibold text-foreground hover:bg-surface disabled:opacity-60"
          disabled={csv.pending}
          onClick={() => void csv.run({ kind: 'invoices', filters })}
        >
          {csv.pending ? copy.actions.exporting : copy.actions.exportInvoices}
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        {list.isPending ? (
          <SkeletonTableRows rows={5} />
        ) : rows.length === 0 ? (
          <ListState error={list.error} empty={copy.empty.invoices} onRetry={() => void list.refetch()} />
        ) : (
          <table className="w-full min-w-[56rem]">
            <thead className="border-b border-border">
              <tr>
                {Object.values(copy.invoiceTable).map((label) => (
                  <th key={label} className={thClass}>
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className={cn(tdClass, 'font-semibold')}>{row.invoiceNumber}</td>
                  <td className={tdClass}>{customerName(row)}</td>
                  <td className={tdClass}>{formatListMoney(row.total)}</td>
                  <td className={tdClass}>
                    <StatusChip status={row.status} options={copy.invoiceStatuses} />
                  </td>
                  <td className={tdClass}>{formatListDate(row.issuedAt)}</td>
                  <td className={tdClass}>{formatListDate(row.dueDate)}</td>
                  <td className={tdClass}>{formatListDate(row.paidAt)}</td>
                  <td className={tdClass}>{optionLabel(copy.paymentMethods, row.paymentMethod)}</td>
                  <td className={cn(tdClass, 'space-x-3 whitespace-nowrap')}>
                    <button type="button" className={linkButtonClass} onClick={() => setModal({ kind: 'preview', row })}>
                      {copy.actions.preview}
                    </button>
                    {canMutate && isOpenInvoice(row.status) ? (
                      <>
                        <button type="button" className={linkButtonClass} onClick={() => setModal({ kind: 'send', row })}>
                          {row.status === 'SENT' ? copy.actions.resend : copy.actions.send}
                        </button>
                        <button
                          type="button"
                          className={cn(linkButtonClass, 'text-success')}
                          onClick={() => setModal({ kind: 'mark-paid', row })}
                        >
                          {copy.actions.markPaid}
                        </button>
                      </>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {list.data && list.data.pagination.totalPages > 1 ? (
        <Pager pagination={list.data.pagination} loading={list.isFetching} onPage={(next) => setPageState({ key: filterKey, page: next })} />
      ) : null}

      <SavedInvoiceModal
        open={modal?.kind === 'preview'}
        invoiceId={modal?.kind === 'preview' ? modal.row.id : null}
        customerName={modal ? customerName(modal.row) : ''}
        onClose={() => setModal(null)}
      />
      {modal?.kind === 'send' ? (
        <SendInvoiceModal
          invoice={{ id: modal.row.id, invoiceNumber: modal.row.invoiceNumber, customerName: customerName(modal.row) }}
          onClose={() => setModal(null)}
        />
      ) : null}
      {modal?.kind === 'mark-paid' ? (
        <MarkInvoicePaidModal
          invoice={{
            id: modal.row.id,
            invoiceNumber: modal.row.invoiceNumber,
            amountLabel: formatListMoney(modal.row.total),
            customerName: customerName(modal.row),
            paymentMethod: modal.row.paymentMethod,
          }}
          onClose={() => setModal(null)}
        />
      ) : null}
    </section>
  )
}

function PaymentsPanel() {
  const [status, setStatus] = useState('')
  const [method, setMethod] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const filters = compactFilters({ status, method, from, to }) as PaymentListFilters
  const filterKey = JSON.stringify(filters)
  const [pageState, setPageState] = useState({ key: filterKey, page: 1 })
  const page = pageState.key === filterKey ? pageState.page : 1
  const list = usePaymentList({ ...filters, page })
  const csv = useCsvExport()
  const rows = list.data?.rows ?? []

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Select inputSize="sm" aria-label={copy.filters.status} value={status} onChange={(e) => setStatus(e.target.value)} options={[...copy.paymentStatuses]} />
        <Select inputSize="sm" aria-label={copy.filters.method} value={method} onChange={(e) => setMethod(e.target.value)} options={[...copy.paymentMethods]} />
        <DateFilters from={from} to={to} onFrom={setFrom} onTo={setTo} />
        <button
          type="button"
          className="ml-auto rounded-lg border border-border px-3 py-2 text-sm font-semibold text-foreground hover:bg-surface disabled:opacity-60"
          disabled={csv.pending}
          onClick={() => void csv.run({ kind: 'payments', filters })}
        >
          {csv.pending ? copy.actions.exporting : copy.actions.exportPayments}
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        {list.isPending ? (
          <SkeletonTableRows rows={5} />
        ) : rows.length === 0 ? (
          <ListState error={list.error} empty={copy.empty.payments} onRetry={() => void list.refetch()} />
        ) : (
          <table className="w-full min-w-[48rem]">
            <thead className="border-b border-border">
              <tr>
                {Object.values(copy.paymentTable).map((label) => (
                  <th key={label} className={thClass}>
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className={cn(tdClass, 'font-semibold')}>{row.customer.name ?? copy.noValue}</td>
                  <td className={tdClass}>{formatListMoney(row.amount)}</td>
                  <td className={tdClass}>{optionLabel(copy.paymentMethods, row.method)}</td>
                  <td className={tdClass}>
                    <StatusChip status={row.status} options={copy.paymentStatuses} />
                  </td>
                  <td className={tdClass}>{formatListDate(row.createdAt)}</td>
                  <td className={tdClass}>{formatListDate(row.paidAt)}</td>
                  <td className={tdClass}>{row.invoiceNumber ?? copy.noValue}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {list.data && list.data.pagination.totalPages > 1 ? (
        <Pager pagination={list.data.pagination} loading={list.isFetching} onPage={(next) => setPageState({ key: filterKey, page: next })} />
      ) : null}
    </section>
  )
}

/** Invoices page (GAP-028): invoice and payment lists with filters, actions and CSV export. */
export function InvoicesScreen() {
  const [tab, setTab] = useState<InvoicesTab>('invoices')
  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{copy.title}</h1>
        <p className="mt-1 text-sm text-muted">{copy.subtitle}</p>
      </header>
      <div role="tablist" className="flex gap-2 border-b border-border">
        {copy.tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            onClick={() => setTab(item.id)}
            className={cn(
              '-mb-px border-b-2 px-3 py-2 text-sm font-semibold',
              tab === item.id ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-foreground',
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
      {tab === 'invoices' ? <InvoicesPanel /> : <PaymentsPanel />}
    </div>
  )
}
