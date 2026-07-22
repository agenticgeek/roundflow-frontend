import { useMemo, useState } from 'react'
import type { DebtCustomerRecord, DebtStatusTab } from '@/content/debt-payment'
import { debtPaymentContent } from '@/content/debt-payment'
import { DebtCustomerDetailPanel } from '@/components/debt-payment/DebtCustomerDetailPanel'
import { DebtInvoicePreviewModal } from '@/components/debt-payment/DebtInvoicePreviewModal'
import { DebtPauseServiceModal } from '@/components/debt-payment/DebtPauseServiceModal'
import { DebtResumeServiceModal } from '@/components/debt-payment/DebtResumeServiceModal'
import { SendPaymentLinkModal } from '@/components/debt-payment/SendPaymentLinkModal'
import { SendPaymentReminderModal } from '@/components/debt-payment/SendPaymentReminderModal'
import { DashboardIcon } from '@/components/dashboard/DashboardIcon'
import { dashboardCtaClass } from '@/components/dashboard/dashboard-styles'
import { Input, Select } from '@/components/ui'
import { cn } from '@/lib/utils'

type DebtActionModal = 'reminder' | 'payment-link' | 'pause' | 'resume' | 'invoice'

function roundValue(round: string) {
  return round.toLowerCase().replace(/\s+/g, '-')
}

function methodValue(method: string) {
  return method.toLowerCase().replace(/\s+/g, '-')
}

const metricToneClass = {
  accent: 'border-transparent bg-accent-surface',
  danger: 'border-danger/25 bg-danger/5',
  warning: 'border-warning-border bg-warning-surface',
} as const

/** Debt / Payment Risk Board — outstanding payments, risk tabs, and customer cards. */
export function DebtPaymentScreen() {
  const [search, setSearch] = useState('')
  const [roundId, setRoundId] = useState('all')
  const [methodId, setMethodId] = useState('all')
  const [activeTab, setActiveTab] = useState<DebtStatusTab>('invoice-sent')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [detailId, setDetailId] = useState<string | null>(null)
  const [actionModal, setActionModal] = useState<DebtActionModal | null>(null)
  const [actionRecord, setActionRecord] = useState<DebtCustomerRecord | null>(null)

  const tabCounts = useMemo(() => {
    const counts = Object.fromEntries(
      debtPaymentContent.statusTabs.map((tab) => [tab.id, 0]),
    ) as Record<DebtStatusTab, number>

    for (const record of debtPaymentContent.records) {
      counts[record.status] += 1
    }

    return counts
  }, [])

  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase()

    return debtPaymentContent.records.filter((record) => {
      if (record.status !== activeTab) return false

      if (roundId !== 'all' && roundValue(record.round) !== roundId) return false
      if (methodId !== 'all' && methodValue(record.paymentMethod) !== methodId) return false

      if (!query) return true

      const haystack = [record.customer, record.address, record.paymentMethod, record.round]
        .join(' ')
        .toLowerCase()

      return haystack.includes(query)
    })
  }, [activeTab, methodId, roundId, search])

  const activeTabLabel =
    debtPaymentContent.statusTabs.find((tab) => tab.id === activeTab)?.label ?? ''

  const resultsLabel = debtPaymentContent.resultsLabel
    .replace('{label}', activeTabLabel)
    .replace('{count}', String(filteredRecords.length))

  const detailRecord =
    debtPaymentContent.records.find((record) => record.id === detailId) ?? null

  const allVisibleSelected =
    filteredRecords.length > 0 && filteredRecords.every((record) => selectedIds.includes(record.id))

  function openAction(modal: DebtActionModal, record: DebtCustomerRecord) {
    setActionRecord(record)
    setActionModal(modal)
  }

  function closeAction() {
    setActionModal(null)
  }

  function toggleSelectAll() {
    if (allVisibleSelected) {
      setSelectedIds((current) =>
        current.filter((id) => !filteredRecords.some((record) => record.id === id)),
      )
      return
    }

    setSelectedIds((current) => {
      const next = new Set(current)
      for (const record of filteredRecords) next.add(record.id)
      return [...next]
    })
  }

  function toggleSelected(id: string) {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    )
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {debtPaymentContent.title}
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-muted">{debtPaymentContent.subtitle}</p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {debtPaymentContent.metrics.map((metric) => (
          <article
            key={metric.id}
            className={cn('rounded-xl border px-4 py-4', metricToneClass[metric.tone])}
          >
            <p className="text-sm font-medium text-muted">{metric.label}</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">{metric.value}</p>
            <p className="mt-1 text-xs text-muted">{metric.helper}</p>
          </article>
        ))}
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative min-w-0 flex-1">
          <DashboardIcon
            name="search"
            className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted"
          />
          <Input
            inputSize="sm"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={debtPaymentContent.searchPlaceholder}
            className="rounded-lg pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Select
            inputSize="sm"
            value={roundId}
            onChange={(event) => setRoundId(event.target.value)}
            options={[...debtPaymentContent.filters.rounds.options]}
            className="min-w-[10rem] rounded-lg border-accent/25 bg-accent-surface"
          />
          <Select
            inputSize="sm"
            value={methodId}
            onChange={(event) => setMethodId(event.target.value)}
            options={[...debtPaymentContent.filters.methods.options]}
            className="min-w-[9rem] rounded-lg border-accent/25 bg-accent-surface"
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {debtPaymentContent.statusTabs.map((tab) => {
          const active = activeTab === tab.id
          const count = tabCounts[tab.id]

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'relative rounded-2xl border-2 px-5 py-5 text-left shadow-sm transition-colors',
                active
                  ? 'border-primary bg-accent-surface'
                  : 'border-border bg-card hover:bg-surface',
              )}
            >
              <p
                className={cn(
                  'text-3xl font-bold tracking-tight',
                  active ? 'text-primary' : 'text-foreground',
                )}
              >
                {count}
              </p>
              <p
                className={cn(
                  'mt-1 text-sm font-medium',
                  active ? 'text-primary' : 'text-muted',
                )}
              >
                {tab.label}
              </p>
              {tab.hasAlert ? (
                <span className="absolute bottom-2.5 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-danger" />
              ) : null}
            </button>
          )
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold text-foreground">{resultsLabel}</p>
        <label className="inline-flex items-center gap-2 text-sm text-muted">
          <input
            type="checkbox"
            checked={allVisibleSelected}
            onChange={toggleSelectAll}
            className="h-4 w-4 rounded border-border text-primary focus:ring-primary/20"
          />
          {debtPaymentContent.selectAll}
        </label>
      </div>

      <div key={activeTab} className="animate-fade-in">
        {filteredRecords.length === 0 ? (
          <p className="rounded-xl border border-border bg-card px-5 py-10 text-center text-sm text-muted">
            No customers match this filter.
          </p>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {filteredRecords.map((record) => (
              <DebtCustomerCard
                key={record.id}
                record={record}
                checked={selectedIds.includes(record.id)}
                active={detailId === record.id}
                onOpen={() => setDetailId(record.id)}
                onToggleChecked={() => toggleSelected(record.id)}
                onSendReminder={() => openAction('reminder', record)}
                onViewInvoice={() => openAction('invoice', record)}
              />
            ))}
          </div>
        )}
      </div>

      <DebtCustomerDetailPanel
        record={detailRecord}
        onClose={() => setDetailId(null)}
        onSendReminder={(record) => openAction('reminder', record)}
        onPaymentLink={(record) => openAction('payment-link', record)}
        onPauseService={(record) => openAction('pause', record)}
        onResumeService={(record) => openAction('resume', record)}
        onExportInvoice={(record) => openAction('invoice', record)}
      />

      <SendPaymentReminderModal
        open={actionModal === 'reminder'}
        record={actionRecord}
        onClose={closeAction}
      />
      <SendPaymentLinkModal
        open={actionModal === 'payment-link'}
        record={actionRecord}
        onClose={closeAction}
      />
      <DebtPauseServiceModal
        open={actionModal === 'pause'}
        record={actionRecord}
        onClose={closeAction}
      />
      <DebtResumeServiceModal
        open={actionModal === 'resume'}
        record={actionRecord}
        onClose={closeAction}
      />
      <DebtInvoicePreviewModal
        open={actionModal === 'invoice'}
        record={actionRecord}
        onClose={closeAction}
      />
    </div>
  )
}

function DebtCustomerCard({
  record,
  checked,
  active,
  onOpen,
  onToggleChecked,
  onSendReminder,
  onViewInvoice,
}: {
  record: DebtCustomerRecord
  checked: boolean
  active: boolean
  onOpen: () => void
  onToggleChecked: () => void
  onSendReminder: () => void
  onViewInvoice: () => void
}) {
  const { actions, contactLabels, lastContactLabel, owedSuffix } = debtPaymentContent

  return (
    <article
      className={cn(
        'cursor-pointer rounded-xl border-2 bg-card p-4 shadow-sm transition-all active:scale-[0.99]',
        active ? 'border-primary' : 'border-border hover:border-primary/40',
      )}
      onClick={onOpen}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <input
            type="checkbox"
            checked={checked}
            onChange={onToggleChecked}
            onClick={(event) => event.stopPropagation()}
            className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary/20"
            aria-label={`Select ${record.customer}`}
          />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">{record.customer}</p>
            <p className="mt-0.5 text-xs text-muted">{record.address}</p>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              onSendReminder()
            }}
            className={cn(dashboardCtaClass, 'px-3 py-1.5 text-xs')}
          >
            {actions.sendReminder}
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              onViewInvoice()
            }}
            className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-surface"
          >
            {actions.viewInvoice}
          </button>
          <button
            type="button"
            aria-label={actions.moreOptions}
            onClick={(event) => event.stopPropagation()}
            className="rounded-lg p-1.5 text-muted transition-colors hover:bg-surface hover:text-foreground"
          >
            <DashboardIcon name="more-vertical" className="h-4 w-4" />
          </button>
        </div>
      </div>

      <p className="mt-3 text-base font-semibold text-danger">
        {record.amountOwed} {owedSuffix}
      </p>

      <div className="mt-3 flex items-end justify-between gap-3">
        <p className="text-xs text-muted">{record.paymentMethod}</p>
        {record.contactStatus === 'contacted' ? (
          <div className="text-right">
            <span className="inline-flex rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-semibold text-success">
              {contactLabels.contacted}
            </span>
            {record.lastContact ? (
              <p className="mt-1 text-xs text-muted">
                {lastContactLabel.replace('{when}', record.lastContact)}
              </p>
            ) : null}
          </div>
        ) : (
          <p className="text-xs text-muted">{contactLabels['not-contacted']}</p>
        )}
      </div>
    </article>
  )
}
