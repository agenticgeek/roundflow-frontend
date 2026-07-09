import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import type { PropertyDetailRecord, PropertyDetailTabId } from '@/content/property-detail'
import { propertyDetailContent } from '@/content/property-detail'
import { ROUTES } from '@/config/routes'
import { DashboardIcon } from '@/components/dashboard/DashboardIcon'
import { PanelCard } from '@/components/dashboard/DashboardControls'
import { dashboardCtaClass } from '@/components/dashboard/dashboard-styles'
import { cn } from '@/lib/utils'

interface PropertyDetailScreenProps {
  property: PropertyDetailRecord
  onSendMessage?: () => void
  onPauseService?: () => void
}

const paymentStatusClass: Record<PropertyDetailRecord['paymentStatus'], string> = {
  paid: 'text-success',
  hold: 'text-warning',
  pending: 'text-primary',
}

/** Customer/property detail — summary, tabs, and overview content. */
export function PropertyDetailScreen({
  property,
  onSendMessage,
  onPauseService,
}: PropertyDetailScreenProps) {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<PropertyDetailTabId>('overview')
  const { actions, statusLabels, summary, tabs, overview, placeholders } = propertyDetailContent

  function handleBack() {
    navigate(ROUTES.roundPlanner, { state: { view: 'list' } })
  }

  return (
    <div className="space-y-5">
      <header className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <button
              type="button"
              onClick={handleBack}
              aria-label={propertyDetailContent.backLabel}
              className="mt-1 rounded-lg p-2 text-muted transition-colors hover:bg-surface hover:text-foreground"
            >
              <DashboardIcon name="arrow-left" className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                {property.customerName}
              </h1>
              <p className="mt-1 text-sm text-muted">{property.shortAddress}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  {statusLabels[property.serviceStatus]}
                </span>
                <span className="inline-flex rounded-full bg-surface px-3 py-1 text-xs font-semibold text-muted">
                  {property.roundLabel}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <ActionButton icon="edit" label={actions.edit} />
            <ActionButton icon="pause" label={actions.pauseService} onClick={onPauseService} />
            <ActionButton icon="message" label={actions.sendMessage} onClick={onSendMessage} />
          </div>
        </div>
      </header>

      <PanelCard interactive={false} className="bg-card p-5 sm:p-6">
        <div className="grid gap-6 md:grid-cols-2">
          <SummaryColumn
            rows={[
              [summary.propertyType, property.propertyType],
              [summary.frequency, property.frequency],
              [summary.price, property.price],
              [summary.cleanMethod, property.cleanMethod],
              [summary.nextDue, property.nextDue],
              [summary.lastCompleted, property.lastCompleted],
              [summary.assignedRound, property.assignedRound],
              [summary.technician, property.technician],
            ]}
          />
          <SummaryColumn
            rows={[
              [
                summary.paymentStatus,
                statusLabels[property.paymentStatus],
                paymentStatusClass[property.paymentStatus],
              ],
              [summary.outstandingBalance, property.outstandingBalance],
              [summary.paymentMethod, property.paymentMethod],
              [summary.lastPayment, property.lastPayment],
              [summary.issuesCount, String(property.issuesCount)],
              [summary.nextVisitStatus, property.nextVisitStatus],
            ]}
          />
        </div>
      </PanelCard>

      <section className="space-y-4">
        <div className="border-b border-border">
          <div className="flex gap-6 overflow-x-auto">
            {tabs.map((tab) => {
              const active = activeTab === tab.id

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'shrink-0 border-b-2 pb-3 text-sm font-semibold transition-colors',
                    active
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted hover:text-foreground',
                  )}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>

        {activeTab === 'overview' ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <InfoCard title={overview.propertyDetails.title}>
              <InfoRow label={overview.propertyDetails.fullAddress} value={property.fullAddress} />
              <InfoRow label={overview.propertyDetails.propertyType} value={property.propertyType} />
              <InfoRow label={overview.propertyDetails.accessNotes} value={property.accessNotes} />
              <InfoRow label={overview.propertyDetails.riskNotes} value={property.riskNotes} />
            </InfoCard>

            <InfoCard title={overview.contact.title}>
              <ContactRow icon="user" label={overview.contact.name} value={property.customerName} />
              <ContactRow icon="phone" label={overview.contact.phone} value={property.phone} />
              <ContactRow icon="mail" label={overview.contact.email} value={property.email} />
            </InfoCard>
          </div>
        ) : (
          <PanelCard interactive={false} className="bg-card p-6 text-sm text-muted">
            {placeholders[activeTab]}
          </PanelCard>
        )}
      </section>
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
    <button
      type="button"
      onClick={onClick}
      className={cn(dashboardCtaClass, 'gap-2')}
    >
      <DashboardIcon name={icon} className="h-4 w-4" />
      {label}
    </button>
  )
}

function SummaryColumn({
  rows,
}: {
  rows: [string, string, string?][]
}) {
  return (
    <dl className="space-y-3 text-sm">
      {rows.map(([label, value, valueClass]) => (
        <div key={label} className="grid grid-cols-[minmax(0,11rem)_1fr] gap-3">
          <dt className="text-muted">{label}</dt>
          <dd className={cn('font-medium text-foreground', valueClass)}>{value}</dd>
        </div>
      ))}
    </dl>
  )
}

function InfoCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <PanelCard interactive={false} className="bg-card p-5 sm:p-6">
      <h2 className="text-lg font-medium text-foreground">{title}</h2>
      <dl className="mt-4 space-y-3">{children}</dl>
    </PanelCard>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[minmax(0,10rem)_1fr] sm:gap-3">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="text-sm font-medium text-foreground">{value}</dd>
    </div>
  )
}

function ContactRow({
  icon,
  label,
  value,
}: {
  icon: string
  label: string
  value: string
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 text-primary">
        <DashboardIcon name={icon} className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <dt className="text-sm text-muted">{label}</dt>
        <dd className="text-sm font-medium text-foreground">{value}</dd>
      </div>
    </div>
  )
}

interface PropertyDetailNotFoundProps {
  onBack: () => void
}

export function PropertyDetailNotFound({ onBack }: PropertyDetailNotFoundProps) {
  const { notFound } = propertyDetailContent

  return (
    <PanelCard interactive={false} className="bg-card p-8 text-center">
      <h1 className="text-2xl font-semibold text-foreground">{notFound.title}</h1>
      <p className="mt-2 text-sm text-muted">{notFound.description}</p>
      <button
        type="button"
        onClick={onBack}
        className={cn(dashboardCtaClass, 'mt-6')}
      >
        {notFound.action}
      </button>
    </PanelCard>
  )
}
