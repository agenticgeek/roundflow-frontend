import { useState } from 'react'
import type { CustomerPropertyRecord } from '@/content/customers'
import type { PropertyDetailRecord, PropertyDetailTabId, PropertyPlanStatus } from '@/content/property-detail'
import { propertyDetailContent } from '@/content/property-detail'
import { AssignToRoundModal } from '@/components/customers/AssignToRoundModal'
import { EditCustomerRecordModal } from '@/components/property-detail/EditCustomerRecordModal'
import { PauseServiceModal } from '@/components/property-detail/PauseServiceModal'
import { SendPropertyMessageModal } from '@/components/property-detail/SendPropertyMessageModal'
import {
  NotesRiskTab,
  PaymentsTab,
  TabPlaceholder,
  VisitHistoryTab,
} from '@/components/property-detail/PropertyDetailTabs'
import { DashboardIcon } from '@/components/dashboard/DashboardIcon'
import { dashboardPressableClass } from '@/components/dashboard/dashboard-styles'
import { cn } from '@/lib/utils'

interface PropertyDetailScreenProps {
  property: PropertyDetailRecord
  customerRecord?: CustomerPropertyRecord | null
  onBack: () => void
}

const cardClass = 'rounded-lg border border-border bg-card shadow-sm'

const serviceStatusClass: Record<PropertyDetailRecord['serviceStatus'], string> = {
  active: 'bg-success/10 text-success',
  paused: 'bg-muted/15 text-muted',
  unassigned: 'bg-warning-surface text-warning',
  hold: 'bg-danger/10 text-danger',
}

const paymentStatusClass: Record<PropertyDetailRecord['paymentStatus'], string> = {
  paid: 'text-success',
  hold: 'text-danger',
  pending: 'text-warning',
}

const propertyDetailActionClass = cn(
  'inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-opacity hover:opacity-90',
  dashboardPressableClass,
)

const propertyDetailOutlineActionClass = cn(
  'inline-flex items-center justify-center gap-2 rounded-lg border border-warning px-4 py-2 text-sm font-semibold text-warning transition-colors hover:bg-warning-surface',
  dashboardPressableClass,
)

/** Customer/property detail — summary cards, tabs, and overview content. */
export function PropertyDetailScreen({
  property,
  customerRecord = null,
  onBack,
}: PropertyDetailScreenProps) {
  const [activeTab, setActiveTab] = useState<PropertyDetailTabId>('overview')
  const [assignOpen, setAssignOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [pauseOpen, setPauseOpen] = useState(false)
  const [messageOpen, setMessageOpen] = useState(false)
  const { actions, assignment, statusLabels, paymentStatusLabels, summary, summaryCards, tabs, overview } =
    propertyDetailContent

  const isUnassigned =
    Boolean(property.needsAssignment) ||
    property.serviceStatus === 'unassigned' ||
    property.planStatus === 'pending'

  const isActive = property.serviceStatus === 'active' && !isUnassigned
  const roundLabel =
    property.assignedRound !== '—' && property.assignedRound !== 'Not Assigned'
      ? property.assignedRound
      : property.roundLabel

  const paymentStatusLabel = isUnassigned ? '—' : paymentStatusLabels[property.paymentStatus]
  const outstandingBalance = isUnassigned ? '—' : property.outstandingBalance
  const paymentMethod = isUnassigned ? '—' : property.paymentMethod
  const issuesCount = isUnassigned ? '—' : String(property.issuesCount)

  return (
    <div className="animate-fade-in space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            aria-label={propertyDetailContent.backLabel}
            className="rounded-lg p-1.5 text-muted transition-colors hover:bg-surface hover:text-foreground"
          >
            <DashboardIcon name="arrow-left" className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              {property.customerName}
            </h1>
            <p className="mt-0.5 text-sm text-muted">{property.shortAddress}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <span
            className={cn(
              'inline-flex rounded-full px-3 py-1 text-xs font-semibold',
              isActive ? 'bg-accent-surface text-accent' : serviceStatusClass[property.serviceStatus],
            )}
          >
            {statusLabels[property.serviceStatus]}
          </span>
          {isActive && roundLabel !== '—' ? (
            <span className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              {roundLabel}
            </span>
          ) : null}
          <ActionButton icon="edit" label={actions.edit} onClick={() => setEditOpen(true)} />
          {isActive ? (
            <button type="button" onClick={() => setPauseOpen(true)} className={propertyDetailOutlineActionClass}>
              <DashboardIcon name="pause" className="h-4 w-4" />
              {actions.pauseService}
            </button>
          ) : null}
          <ActionButton icon="message" label={actions.sendMessage} onClick={() => setMessageOpen(true)} />
        </div>
      </header>

      {isUnassigned ? (
        <div
          className={cn(
            cardClass,
            'flex flex-col gap-4 border-accent/25 bg-accent-surface px-5 py-4 sm:flex-row sm:items-center sm:justify-between',
          )}
        >
          <div className="flex gap-3">
            <DashboardIcon name="info" className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div>
              <p className="text-sm font-semibold text-foreground">{assignment.title}</p>
              <p className="mt-0.5 text-sm text-muted">{assignment.description}</p>
            </div>
          </div>
          <button type="button" className={cn(propertyDetailActionClass, 'shrink-0')} onClick={() => setAssignOpen(true)}>
            {assignment.action}
          </button>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <SummaryCard title={summaryCards.propertyInformation}>
          <SummaryRow label={summary.propertyType} value={property.propertyType} />
          <SummaryRow label={summary.frequency} value={property.frequency} />
          <SummaryRow label={summary.price} value={property.price} />
          <SummaryRow label={summary.cleanMethod} value={property.cleanMethod} />
          <SummaryRow
            label={summary.nextDue}
            value={property.nextDue}
            valueClass={isUnassigned ? 'text-warning' : undefined}
          />
          {!isUnassigned ? (
            <SummaryRow label={summary.lastCompleted} value={property.lastCompleted} />
          ) : null}
          <SummaryRow label={summary.assignedRound} value={property.assignedRound} />
          <SummaryRow label={summary.technician} value={property.technician} />
        </SummaryCard>

        <SummaryCard title={summaryCards.paymentStatus}>
          <SummaryRow
            label={summary.paymentStatus}
            value={paymentStatusLabel}
            valueClass={
              paymentStatusLabel === '—' ? undefined : paymentStatusClass[property.paymentStatus]
            }
          />
          <SummaryRow label={summary.outstandingBalance} value={outstandingBalance} />
          <SummaryRow label={summary.paymentMethod} value={paymentMethod} />
          {!isUnassigned ? (
            <SummaryRow label={summary.lastPayment} value={property.lastPayment} />
          ) : null}
          <SummaryRow label={summary.issuesCount} value={issuesCount} />
          <SummaryRow
            label={summary.nextVisitStatus}
            value={property.nextVisitStatus}
            valueClass={isUnassigned ? 'text-warning' : undefined}
          />
        </SummaryCard>
      </div>

      <section className={cn(cardClass, 'overflow-hidden')}>
        <div className="border-b border-border px-6 pt-1">
          <div className="flex gap-6 overflow-x-auto">
            {tabs.map((tab) => {
              const active = activeTab === tab.id

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'shrink-0 border-b-2 px-0.5 py-3.5 text-sm font-semibold transition-colors',
                    active
                      ? 'border-foreground text-foreground'
                      : 'border-transparent text-muted hover:text-foreground',
                  )}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>

        <div key={activeTab} className="animate-fade-in p-6">
          {activeTab === 'overview' ? (
            <>
              <h2 className="text-base font-semibold text-foreground">{overview.propertyDetails.title}</h2>
              <dl className="mt-5 grid gap-6 sm:grid-cols-2">
                <OverviewField label={overview.propertyDetails.fullAddress} value={property.fullAddress} />
                <OverviewField label={overview.propertyDetails.propertyType} value={property.propertyType} />
              </dl>
            </>
          ) : activeTab === 'service-plan' ? (
            <ServicePlanTab
              property={property}
              isUnassigned={isUnassigned}
              onAssign={() => setAssignOpen(true)}
            />
          ) : activeTab === 'visit-history' ? (
            <VisitHistoryTab property={property} />
          ) : activeTab === 'payments' ? (
            <PaymentsTab property={property} />
          ) : activeTab === 'notes-risk' ? (
            <NotesRiskTab property={property} />
          ) : activeTab === 'photos' ? (
            <TabPlaceholder label={activeTab} />
          ) : null}
        </div>
      </section>

      <AssignToRoundModal open={assignOpen} record={customerRecord} onClose={() => setAssignOpen(false)} />
      <EditCustomerRecordModal open={editOpen} property={property} onClose={() => setEditOpen(false)} />
      <PauseServiceModal open={pauseOpen} property={property} onClose={() => setPauseOpen(false)} />
      <SendPropertyMessageModal open={messageOpen} property={property} onClose={() => setMessageOpen(false)} />
    </div>
  )
}

function ActionButton({
  icon,
  label,
  onClick,
}: {
  icon: string
  label: string
  onClick?: () => void
}) {
  return (
    <button type="button" onClick={onClick} className={propertyDetailActionClass}>
      <DashboardIcon name={icon} className="h-4 w-4" />
      {label}
    </button>
  )
}

function SummaryCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <article className={cn(cardClass, 'p-6')}>
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      <dl className="mt-5 space-y-3.5">{children}</dl>
    </article>
  )
}

function SummaryRow({
  label,
  value,
  valueClass,
}: {
  label: string
  value: string
  valueClass?: string
}) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <dt className="text-muted">{label}</dt>
      <dd className={cn('font-semibold text-foreground', valueClass)}>{value}</dd>
    </div>
  )
}

function OverviewField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-sm font-semibold text-foreground">{label}</dt>
      <dd className="mt-1.5 text-sm text-foreground">{value}</dd>
    </div>
  )
}

const planStatusClass: Record<PropertyPlanStatus, string> = {
  active: 'bg-success/10 text-success',
  pending: 'bg-warning-surface text-warning-foreground',
  paused: 'bg-muted/15 text-muted',
  hold: 'bg-danger/10 text-danger',
}

function ServicePlanTab({
  property,
  isUnassigned,
  onAssign,
}: {
  property: PropertyDetailRecord
  isUnassigned: boolean
  onAssign: () => void
}) {
  const { servicePlan, planStatusLabels, assignment } = propertyDetailContent
  const planStatus = property.planStatus ?? (isUnassigned ? 'pending' : 'active')
  const roundAssignment = isUnassigned ? servicePlan.notAssigned : property.assignedRound
  const serviceType = property.serviceType ?? servicePlan.defaultServiceType
  const showAssignButton =
    isUnassigned || planStatus === 'pending' || property.serviceStatus === 'unassigned'

  return (
    <>
      <h2 className="text-base font-semibold text-foreground">{servicePlan.title}</h2>
      <dl className="mt-5 grid gap-6 sm:grid-cols-2">
        <ServicePlanField label={servicePlan.frequency} value={property.frequency} />
        <ServicePlanField label={servicePlan.serviceType} value={serviceType} />
        <div>
          <dt className="text-sm font-semibold text-foreground">{servicePlan.roundAssignment}</dt>
          <dd className={cn('mt-1.5 text-sm', isUnassigned ? 'text-warning' : 'text-foreground')}>
            {roundAssignment}
          </dd>
          {showAssignButton ? (
            <button type="button" className={cn(propertyDetailActionClass, 'mt-4')} onClick={onAssign}>
              {assignment.action}
            </button>
          ) : null}
        </div>
        <div>
          <dt className="text-sm font-semibold text-foreground">{servicePlan.planStatus}</dt>
          <dd className="mt-1.5">
            <span
              className={cn(
                'inline-flex rounded-md px-2 py-0.5 text-xs font-semibold',
                planStatusClass[planStatus],
              )}
            >
              {planStatusLabels[planStatus]}
            </span>
          </dd>
        </div>
      </dl>
    </>
  )
}

function ServicePlanField({
  label,
  value,
  valueClass,
}: {
  label: string
  value: string
  valueClass?: string
}) {
  return (
    <div>
      <dt className="text-sm font-semibold text-foreground">{label}</dt>
      <dd className={cn('mt-1.5 text-sm text-foreground', valueClass)}>{value}</dd>
    </div>
  )
}

interface PropertyDetailNotFoundProps {
  onBack: () => void
}

export function PropertyDetailNotFound({ onBack }: PropertyDetailNotFoundProps) {
  const { notFound } = propertyDetailContent

  return (
    <article className={cn(cardClass, 'p-8 text-center')}>
      <h1 className="text-2xl font-semibold text-foreground">{notFound.title}</h1>
      <p className="mt-2 text-sm text-muted">{notFound.description}</p>
      <button type="button" onClick={onBack} className={cn(propertyDetailActionClass, 'mt-6')}>
        {notFound.action}
      </button>
    </article>
  )
}
