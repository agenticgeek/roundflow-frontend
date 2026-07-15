import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { CustomerPaymentStatus, CustomerPropertyRecord, CustomerStatus } from '@/content/customers'
import { customersContent } from '@/content/customers'
import { propertyDetailPath } from '@/config/routes'
import { DashboardIcon } from '@/components/dashboard/DashboardIcon'
import { PanelCard } from '@/components/dashboard/DashboardControls'
import { dashboardCtaClass, dashboardHoverCardClass } from '@/components/dashboard/dashboard-styles'
import { Input, MultiSelect, Select } from '@/components/ui'
import { AssignToRoundModal } from '@/components/customers/AssignToRoundModal'
import { cn } from '@/lib/utils'

const statusClass: Record<CustomerStatus, string> = {
  active: 'bg-success/10 text-success',
  hold: 'bg-danger/10 text-danger',
  cancelled: 'bg-muted/20 text-muted',
}

const paymentStatusClass: Record<CustomerPaymentStatus, string> = {
  paid: 'bg-success/10 text-success',
  hold: 'bg-danger/10 text-danger',
  pending: 'bg-warning-surface text-warning',
}

const metricClass: Record<(typeof customersContent.metrics)[number]['tone'], string> = {
  default: 'border-border bg-card text-foreground',
  success: 'border-success/20 bg-success/10 text-success',
  danger: 'border-danger/20 bg-danger/10 text-danger',
  warning: 'border-warning-border bg-warning-surface text-warning-foreground',
}

function roundValue(round: string) {
  return round.toLowerCase().replace(/\s+/g, '-')
}

const defaultStatusFilters = customersContent.filters.status.options.map((option) => option.value)

function matchesStatusFilter(record: CustomerPropertyRecord, selectedStatuses: string[]) {
  if (selectedStatuses.length === 0 || selectedStatuses.length === defaultStatusFilters.length) {
    return true
  }

  return selectedStatuses.some((statusId) => {
    switch (statusId) {
      case 'active':
        return record.status === 'active' && !record.amountDue
      case 'hold':
        return record.status === 'hold'
      case 'payment-overdue':
        return Boolean(record.amountDue)
      case 'cancelled':
        return record.status === 'cancelled'
      default:
        return false
    }
  })
}

/** Customers & Properties module — searchable property records and assignment prompts. */
export function CustomersScreen() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [roundId, setRoundId] = useState('all')
  const [statusIds, setStatusIds] = useState<string[]>(() => [...defaultStatusFilters])
  const [assignRecordId, setAssignRecordId] = useState<string | null>(null)

  const assignRecord = useMemo(
    () => customersContent.records.find((record) => record.id === assignRecordId) ?? null,
    [assignRecordId],
  )

  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase()

    return customersContent.records.filter((record) => {
      if (roundId !== 'all') {
        const matchesNotAssigned = roundId === 'not-assigned' && record.needsAssignment
        if (!matchesNotAssigned && roundValue(record.round) !== roundId) return false
      }

      if (!matchesStatusFilter(record, statusIds)) return false

      if (!query) return true

      const haystack = [
        record.customer,
        record.address,
        record.round,
        record.technician,
        record.paymentStatus,
      ]
        .join(' ')
        .toLowerCase()

      return haystack.includes(query)
    })
  }, [roundId, search, statusIds])

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {customersContent.header.title}
        </h1>
        <p className="mt-1 text-sm text-muted">{customersContent.header.subtitle}</p>
      </header>

      <PanelCard interactive={false} className="border-primary/15 bg-accent-surface/50 px-5 py-4">
        <p className="text-sm text-foreground">
          <span className="font-semibold text-primary">How to use:</span>{' '}
          {customersContent.howToUse.replace('How to use: ', '')}
        </p>
      </PanelCard>

      <div className="relative">
        <DashboardIcon
          name="search"
          className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-muted"
        />
        <Input
          aria-label={customersContent.search.label}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={customersContent.search.placeholder}
          className="bg-card pl-11"
        />
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {customersContent.metrics.map((metric) => (
            <PanelCard
              key={metric.id}
              interactive={false}
              className={cn('min-w-[8rem] px-4 py-3', metricClass[metric.tone])}
            >
              <p className="text-sm text-muted">{metric.label}</p>
              <p className="mt-2 text-2xl font-semibold">{metric.value}</p>
            </PanelCard>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Select
            inputSize="sm"
            aria-label={customersContent.filters.round.label}
            value={roundId}
            onChange={(event) => setRoundId(event.target.value)}
            options={[...customersContent.filters.round.options]}
            className="min-w-36 border-accent/25 bg-accent-surface shadow-none"
          />
          <MultiSelect
            inputSize="sm"
            aria-label={customersContent.filters.status.label}
            label={customersContent.filters.status.label}
            allLabel={customersContent.filters.status.allLabel}
            value={statusIds}
            onChange={setStatusIds}
            options={[...customersContent.filters.status.options]}
            className="min-w-36 border-accent/25 bg-accent-surface shadow-none"
          />
        </div>
      </div>

      <section className="space-y-3">
        {filteredRecords.length === 0 ? (
          <PanelCard interactive={false} className="py-10 text-center text-sm text-muted">
            {customersContent.emptyLabel}
          </PanelCard>
        ) : (
          filteredRecords.map((record) => (
            <CustomerRecordCard
              key={record.id}
              record={record}
              onOpen={() =>
                navigate(propertyDetailPath(record.propertyId), { state: { from: 'customers' } })
              }
              onAssign={() => setAssignRecordId(record.id)}
            />
          ))
        )}
      </section>

      <AssignToRoundModal
        open={assignRecord !== null}
        record={assignRecord}
        onClose={() => setAssignRecordId(null)}
      />
    </div>
  )
}

function CustomerRecordCard({
  record,
  onOpen,
  onAssign,
}: {
  record: CustomerPropertyRecord
  onOpen: () => void
  onAssign: () => void
}) {
  const { recordLabels, statusLabels, assignment } = customersContent

  return (
    <PanelCard
      interactive={false}
      className={cn('bg-card px-4 py-4 sm:px-5', dashboardHoverCardClass)}
    >
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full items-start justify-between gap-4 text-left"
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold text-foreground">{record.customer}</h2>
            <span
              className={cn(
                'rounded-md px-2 py-0.5 text-[11px] font-semibold',
                statusClass[record.status],
              )}
            >
              {statusLabels[record.status]}
            </span>
            {record.amountDue ? (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-danger">
                <DashboardIcon name="alert" className="h-3.5 w-3.5" />
                {record.amountDue}
              </span>
            ) : null}
          </div>
          <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-muted">
            <DashboardIcon name="map-pin" className="h-4 w-4" />
            {record.address}
          </p>
        </div>

        <DashboardIcon name="chevron-right" className="mt-1 h-5 w-5 shrink-0 text-muted" />
      </button>

      <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs">
        <MetaItem label={recordLabels.round} value={record.round} />
        <MetaItem label={recordLabels.frequency} value={record.frequency} />
        <MetaItem label={recordLabels.price} value={record.price} />
        <MetaItem label={recordLabels.technician} value={record.technician} />
        <MetaItem label={recordLabels.nextDue} value={record.nextDue} />
        <div className="flex items-center gap-1.5">
          <dt className="font-semibold text-foreground">{recordLabels.paymentStatus}:</dt>
          <dd>
            <span
              className={cn(
                'rounded px-1.5 py-0.5 text-[11px] font-semibold',
                paymentStatusClass[record.paymentStatus],
              )}
            >
              {statusLabels[record.paymentStatus] ?? record.paymentStatus}
            </span>
          </dd>
        </div>
      </dl>

      {record.needsAssignment ? (
        <div className="mt-4 flex flex-col gap-3 rounded-xl border border-primary/30 bg-accent-surface px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-3">
            <DashboardIcon name="info" className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div>
              <p className="text-sm font-semibold text-foreground">{assignment.title}</p>
              <p className="mt-0.5 text-xs text-muted">{assignment.description}</p>
            </div>
          </div>
          <button
            type="button"
            className={cn(dashboardCtaClass, 'shrink-0')}
            onClick={(event) => {
              event.stopPropagation()
              onAssign()
            }}
          >
            {assignment.action}
          </button>
        </div>
      ) : null}
    </PanelCard>
  )
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <dt className="font-semibold text-foreground">{label}:</dt>
      <dd className="text-muted">{value}</dd>
    </div>
  )
}
