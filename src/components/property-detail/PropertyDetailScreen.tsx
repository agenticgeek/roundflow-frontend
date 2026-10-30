import { useState } from 'react'
import type { CustomerPropertyRecord } from '@/content/customers'
import type {
  PropertyDetailRecord,
  PropertyDetailTabId,
  PropertyPlanStatus,
  PropertyServicePlan,
} from '@/content/property-detail'
import { propertyDetailContent } from '@/content/property-detail'
import { AssignToRoundModal } from '@/components/customers/AssignToRoundModal'
import { ChangeFrequencyModal } from '@/components/property-detail/ChangeFrequencyModal'
import { EditCustomerRecordModal } from '@/components/property-detail/EditCustomerRecordModal'
import { PauseServiceModal } from '@/components/property-detail/PauseServiceModal'
import { EditServicePlanModal } from '@/components/property-detail/EditServicePlanModal'
import { SendPropertyMessageModal } from '@/components/property-detail/SendPropertyMessageModal'
import {
  NotesRiskTab,
  PaymentsTab,
  VisitHistoryTab,
} from '@/components/property-detail/PropertyDetailTabs'
import { BadDebtBadge, BadDebtControl } from '@/components/property-detail/BadDebtControl'
import { PropertyPhotosTab } from '@/components/property-detail/PropertyPhotosTab'
import { DashboardIcon } from '@/components/dashboard/DashboardIcon'
import { dashboardPressableClass } from '@/components/dashboard/dashboard-styles'
import { useResumeProperty } from '@/features/properties/hooks/useProperties'
import { useResumeServicePlan } from '@/features/service-plans/hooks/useServicePlans'
import { useAppBootstrap } from '@/providers/AppBootstrapProvider'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'

export type PropertyDetailTabData = {
  visits: import('@/content/property-detail').PropertyVisitRecord[]
  payments?: import('@/content/property-detail').PropertyPaymentRecord[] | null
  notes: import('@/content/property-detail').PropertyNoteRecord[]
}

interface PropertyDetailScreenProps {
  property: PropertyDetailRecord
  customerRecord?: CustomerPropertyRecord | null
  customerId: string
  tabData?: PropertyDetailTabData | null
  /** `customer.badDebt` from GET /customers/:id (GAP-022). */
  badDebt?: boolean
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
  unpaid: 'text-warning',
  none: 'text-muted',
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
  customerId,
  tabData = null,
  badDebt = false,
  onBack,
}: PropertyDetailScreenProps) {
  const [activeTab, setActiveTab] = useState<PropertyDetailTabId>('overview')
  const [assignOpen, setAssignOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [frequencyOpen, setFrequencyOpen] = useState(false)
  const [pauseOpen, setPauseOpen] = useState(false)
  const [messageOpen, setMessageOpen] = useState(false)
  const { actions, assignment, statusLabels, paymentStatusLabels, summary, summaryCards, tabs } =
    propertyDetailContent
  const resumePropertyMutation = useResumeProperty()
  const resumePlan = useResumeServicePlan()
  const resumeProperty = property.primaryPlanId ? resumePlan : resumePropertyMutation
  /** One plan of a multi-plan property being edited or paused from its card. */
  const [editingPlan, setEditingPlan] = useState<PropertyServicePlan | null>(null)
  const [pausingPlan, setPausingPlan] = useState<PropertyServicePlan | null>(null)
  const { canMutate } = useAppBootstrap()
  const { showToast } = useToast()

  
  const isUnassigned =
    Boolean(property.needsAssignment) ||
    property.serviceStatus === 'unassigned' ||
    property.planStatus === 'pending'

  const isActive = property.serviceStatus === 'active' && !isUnassigned
  const isPaused = property.serviceStatus === 'paused'
  const roundLabel =
    property.assignedRound !== '—' && property.assignedRound !== 'Not Assigned'
      ? property.assignedRound
      : property.roundLabel

  const paymentStatusLabel = isUnassigned ? '—' : paymentStatusLabels[property.paymentStatus]
  const outstandingBalance = isUnassigned ? '—' : property.outstandingBalance
  const paymentMethod = isUnassigned ? '—' : property.paymentMethod
  const issuesCount = isUnassigned ? '—' : String(property.issuesCount)

  async function handleResume() {
    if (!canMutate || resumeProperty.isPending) return
    try {
      // The header acts on the primary plan — by id when known, so a multi-plan property
      // resumes the plan the summary shows.
      if (property.primaryPlanId) await resumePlan.mutateAsync(property.primaryPlanId)
      else await resumePropertyMutation.mutateAsync(property.id)
      showToast('Service resumed')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Could not resume service')
    }
  }

  async function handleResumePlan(plan: PropertyServicePlan) {
    if (!canMutate || resumePlan.isPending) return
    try {
      await resumePlan.mutateAsync(plan.id)
      showToast(
        propertyDetailContent.servicePlan.planActions.resumed.replace(
          '{service}',
          plan.serviceName || propertyDetailContent.servicePlan.unnamedService,
        ),
      )
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Could not resume service')
    }
  }

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
          {badDebt ? <BadDebtBadge /> : null}
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
          {isPaused ? (
            <button
              type="button"
              onClick={() => void handleResume()}
              disabled={!canMutate || resumeProperty.isPending}
              className={propertyDetailActionClass}
            >
              Resume Service
            </button>
          ) : null}
          <ActionButton icon="message" label={actions.sendMessage} onClick={() => setMessageOpen(true)} />
          {canMutate ? (
            <BadDebtControl customerId={customerId} customerName={property.customerName} badDebt={badDebt} />
          ) : null}
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
            <OverviewTab
              property={property}
              canMutate={canMutate}
              onChangeFrequency={() => setFrequencyOpen(true)}
            />
          ) : activeTab === 'service-plan' ? (
            <ServicePlanTab
              property={property}
              isUnassigned={isUnassigned}
              onAssign={() => setAssignOpen(true)}
              planActions={
                canMutate
                  ? {
                      onEdit: setEditingPlan,
                      onPause: setPausingPlan,
                      onResume: (plan) => void handleResumePlan(plan),
                      resumingId: resumePlan.isPending ? (resumePlan.variables ?? null) : null,
                    }
                  : undefined
              }
            />
          ) : activeTab === 'visit-history' ? (
            <VisitHistoryTab property={property} visits={tabData?.visits} customerId={customerId} />
          ) : activeTab === 'payments' ? (
            <PaymentsTab property={property} payments={tabData?.payments} />
          ) : activeTab === 'notes-risk' ? (
            <NotesRiskTab
              property={property}
              notes={tabData?.notes}
              customerId={customerId}
            />
          ) : activeTab === 'photos' ? (
            <PropertyPhotosTab propertyId={property.id} />
          ) : null}
        </div>
      </section>

      {activeTab === 'overview' ? <ContactInformationCard property={property} /> : null}

      <AssignToRoundModal open={assignOpen} record={customerRecord} onClose={() => setAssignOpen(false)} />
      <ChangeFrequencyModal
        open={frequencyOpen}
        property={property}
        onClose={() => setFrequencyOpen(false)}
      />
      <EditCustomerRecordModal
        open={editOpen}
        property={property}
        customerId={customerId}
        onClose={() => setEditOpen(false)}
      />
      <PauseServiceModal
        open={pauseOpen}
        property={property}
        planId={property.primaryPlanId}
        onClose={() => setPauseOpen(false)}
      />
      <PauseServiceModal
        open={pausingPlan != null}
        property={property}
        planId={pausingPlan?.id}
        planName={pausingPlan?.serviceName}
        onClose={() => setPausingPlan(null)}
      />
      <EditServicePlanModal
        open={editingPlan != null}
        plan={editingPlan}
        customerName={property.customerName}
        onClose={() => setEditingPlan(null)}
      />
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

function OverviewTab({
  property,
  canMutate,
  onChangeFrequency,
}: {
  property: PropertyDetailRecord
  canMutate: boolean
  onChangeFrequency: () => void
}) {
  const { overview } = propertyDetailContent

  return (
    <article>
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-base font-semibold text-foreground">{overview.propertyDetails.title}</h2>
        {canMutate ? (
          <button
            type="button"
            onClick={onChangeFrequency}
            className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-primary transition-opacity hover:opacity-80"
          >
            <DashboardIcon name="edit" className="h-4 w-4" />
            {overview.propertyDetails.changeFrequency}
          </button>
        ) : null}
      </div>
      <dl className="mt-5 grid gap-6 sm:grid-cols-2">
        <div>
          <OverviewField
            label={overview.propertyDetails.fullAddress}
            value={property.fullAddress}
          />
          <OverviewField
            className="mt-6"
            label={overview.propertyDetails.accessNotes}
            value={property.accessNotes}
          />
        </div>
        <div>
          <OverviewField
            label={overview.propertyDetails.propertyType}
            value={property.propertyType}
          />
          <OverviewField
            className="mt-6"
            label={overview.propertyDetails.riskNotes}
            value={property.riskNotes}
          />
        </div>
      </dl>
    </article>
  )
}

function ContactInformationCard({ property }: { property: PropertyDetailRecord }) {
  const { overview } = propertyDetailContent

  return (
    <article className={cn(cardClass, 'overflow-hidden')}>
      <h2 className="border-b border-border bg-surface px-5 py-3 text-base font-semibold text-foreground">
        {overview.contact.title}
      </h2>
      <ul className="space-y-3.5 px-5 py-5">
        <ContactRow icon="user" value={property.customerName} />
        <ContactRow icon="phone" value={property.phone.trim() || '—'} />
        <ContactRow icon="phone" label={overview.contact.landline} value={property.landline.trim() || '—'} />
        <ContactRow icon="mail" value={property.email.trim() || '—'} />
      </ul>
    </article>
  )
}

function OverviewField({
  label,
  value,
  className,
}: {
  label: string
  value: string
  className?: string
}) {
  return (
    <div className={className}>
      <dt className="text-sm font-semibold text-foreground">{label}</dt>
      <dd className="mt-1.5 text-sm text-foreground">{value}</dd>
    </div>
  )
}

function ContactRow({ icon, label, value }: { icon: string; label?: string; value: string }) {
  return (
    <li className="flex items-center gap-3 text-sm text-foreground">
      <DashboardIcon name={icon} className="h-4 w-4 shrink-0 text-muted" />
      <span>
        {label ? <span className="text-muted">{label}: </span> : null}
        {value}
      </span>
    </li>
  )
}

const planStatusClass: Record<PropertyPlanStatus, string> = {
  active: 'bg-success/10 text-success',
  pending: 'bg-warning-surface text-warning-foreground',
  paused: 'bg-muted/15 text-muted',
  hold: 'bg-danger/10 text-danger',
}

interface PlanActions {
  onEdit: (plan: PropertyServicePlan) => void
  onPause: (plan: PropertyServicePlan) => void
  onResume: (plan: PropertyServicePlan) => void
  /** Plan id currently being resumed. */
  resumingId: string | null
}

function ServicePlanTab({
  property,
  isUnassigned,
  onAssign,
  planActions,
}: {
  property: PropertyDetailRecord
  isUnassigned: boolean
  onAssign: () => void
  planActions?: PlanActions
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

      <ServicePlanList plans={property.servicePlans ?? []} actions={planActions} />
    </>
  )
}

const servicePlanStatusClass: Record<PropertyServicePlan['status'], string> = {
  active: 'bg-success/10 text-success',
  paused: 'bg-muted/15 text-muted',
  cancelled: 'bg-danger/10 text-danger',
}

/**
 * Every service plan on the property (multi-plan) — each with its own service, price and
 * cadence. With 2+ plans each card gets its own Edit / Pause / Resume (PATCH, POST
 * /service-plans/:id…); a single plan is changed from the header actions.
 */
function ServicePlanList({
  plans,
  actions,
}: {
  plans: readonly PropertyServicePlan[]
  actions?: PlanActions
}) {
  const { servicePlan } = propertyDetailContent
  const showActions = Boolean(actions) && plans.length > 1

  return (
    <section className="mt-8 border-t border-border pt-6">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-semibold text-foreground">{servicePlan.plansTitle}</h3>
        {plans.length > 0 ? (
          <span className="text-xs text-muted">
            {servicePlan.plansCount.replace('{count}', String(plans.length))}
          </span>
        ) : null}
      </div>

      {plans.length === 0 ? (
        <p className="mt-3 text-sm text-muted">{servicePlan.noPlans}</p>
      ) : (
        <ul className="mt-3 grid gap-3 lg:grid-cols-2">
          {plans.map((plan) => (
            <li key={plan.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {plan.serviceName || servicePlan.unnamedService}
                  </p>
                  {plan.isPrimary && plans.length > 1 ? (
                    <span className="shrink-0 rounded-md bg-accent-surface px-1.5 py-0.5 text-[11px] font-semibold text-accent">
                      {servicePlan.primaryBadge}
                    </span>
                  ) : null}
                </div>
                <span
                  className={cn(
                    'shrink-0 rounded-md px-2 py-0.5 text-xs font-semibold',
                    servicePlanStatusClass[plan.status],
                  )}
                >
                  {servicePlan.planStatusLabels[plan.status]}
                </span>
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                <PlanFact label={servicePlan.plan.frequency} value={plan.frequency} />
                <PlanFact label={servicePlan.plan.price} value={plan.price} />
                <PlanFact label={servicePlan.plan.nextDue} value={plan.nextDue} />
                <PlanFact label={servicePlan.plan.lastCompleted} value={plan.lastCompleted} />
                <PlanFact label={servicePlan.plan.paymentMethod} value={plan.paymentMethod} />
              </dl>
              {plan.pauseWindow ? (
                <p className="mt-3 text-xs text-muted">
                  {servicePlan.pausedWindow.replace('{window}', plan.pauseWindow)}
                </p>
              ) : null}
              {showActions && actions && plan.status !== 'cancelled' ? (
                <div className="mt-3 flex gap-4 border-t border-border pt-3 text-xs font-semibold">
                  <button type="button" onClick={() => actions.onEdit(plan)} className="text-primary hover:underline">
                    {servicePlan.planActions.edit}
                  </button>
                  {plan.status === 'paused' ? (
                    <button
                      type="button"
                      onClick={() => actions.onResume(plan)}
                      disabled={actions.resumingId === plan.id}
                      className="text-primary hover:underline disabled:opacity-60"
                    >
                      {actions.resumingId === plan.id ? servicePlan.planActions.resuming : servicePlan.planActions.resume}
                    </button>
                  ) : (
                    <button type="button" onClick={() => actions.onPause(plan)} className="text-warning hover:underline">
                      {servicePlan.planActions.pause}
                    </button>
                  )}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function PlanFact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted">{label}</dt>
      <dd className="mt-0.5 font-medium text-foreground">{value}</dd>
    </div>
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
