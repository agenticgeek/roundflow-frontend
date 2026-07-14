import type { DebtCustomerRecord, DebtStatusTab } from '@/content/debt-payment'
import { debtPaymentContent } from '@/content/debt-payment'
import { DashboardIcon } from '@/components/dashboard/DashboardIcon'
import { dashboardCtaClass } from '@/components/dashboard/dashboard-styles'
import { SidePanel } from '@/components/ui/side-panel'
import { cn } from '@/lib/utils'

interface DebtCustomerDetailPanelProps {
  record: DebtCustomerRecord | null
  onClose: () => void
  onSendReminder: (record: DebtCustomerRecord) => void
  onPaymentLink: (record: DebtCustomerRecord) => void
  onPauseService: (record: DebtCustomerRecord) => void
  onResumeService: (record: DebtCustomerRecord) => void
  onExportInvoice: (record: DebtCustomerRecord) => void
}

const statusLabel = Object.fromEntries(
  debtPaymentContent.statusTabs.map((tab) => [tab.id, tab.label]),
) as Record<DebtStatusTab, string>

/** Customer debt detail drawer — payment summary, risk, contact, and actions. */
export function DebtCustomerDetailPanel({
  record,
  onClose,
  onSendReminder,
  onPaymentLink,
  onPauseService,
  onResumeService,
  onExportInvoice,
}: DebtCustomerDetailPanelProps) {
  const { detailPanel, contactLabels, lastContactLabel } = debtPaymentContent

  if (!record) return null

  const daysOverdueLabel =
    record.daysOverdue > 0 ? String(record.daysOverdue) : detailPanel.notYetOverdue

  return (
    <SidePanel
      open
      onClose={onClose}
      title={record.customer}
      subtitle={record.address}
      titleBadge={
        <span className="inline-flex rounded-full bg-accent-surface px-2 py-0.5 text-[10px] font-semibold text-primary">
          {statusLabel[record.status]}
        </span>
      }
      widthClass="max-w-md"
      className="[&_header_h2]:text-base [&_header_p]:text-xs"
      bodyClassName="space-y-4 text-xs"
      footerClassName="border-border bg-accent-surface"
      footer={
        <div className="space-y-2.5">
          <div className="grid grid-cols-2 gap-2.5">
            <ActionCard
              icon="send"
              label={detailPanel.actions.sendReminder}
              onClick={() => onSendReminder(record)}
            />
            <ActionCard
              icon="link"
              label={detailPanel.actions.paymentLink}
              onClick={() => onPaymentLink(record)}
            />
            <ActionCard
              icon="pause"
              label={detailPanel.actions.pauseService}
              onClick={() => onPauseService(record)}
              tone="warning"
            />
            <ActionCard
              icon="play"
              label={detailPanel.actions.resumeService}
              onClick={() => onResumeService(record)}
              tone="success"
            />
          </div>
          <button
            type="button"
            onClick={() => onExportInvoice(record)}
            className={cn(dashboardCtaClass, 'w-full gap-1.5 py-2.5 text-xs')}
          >
            <DashboardIcon name="download" className="h-3.5 w-3.5" />
            {detailPanel.actions.exportInvoice}
          </button>
        </div>
      }
    >
      <div className="grid grid-cols-3 gap-2.5">
        <StatBox
          value={record.amountOwed}
          label={detailPanel.stats.outstanding}
          tone="danger"
        />
        <StatBox
          value={
            record.daysOverdue > 0 ? String(record.daysOverdue) : detailPanel.overdueEmpty
          }
          label={detailPanel.stats.overdue}
          tone="warning"
        />
        <StatBox value={record.paymentMethod} label={detailPanel.stats.method} tone="default" />
      </div>

      <section>
        <h3 className="text-[10px] font-bold tracking-wider text-muted uppercase">
          {detailPanel.sections.paymentSummary}
        </h3>
        <dl className="mt-2 divide-y divide-border border-y border-border">
          <DetailRow label={detailPanel.fields.invoiceDate} value={record.invoiceDate} />
          <DetailRow
            label={detailPanel.fields.amountOwed}
            value={record.amountOwed}
            valueClassName="font-semibold text-danger"
          />
          <DetailRow label={detailPanel.fields.daysOverdue} value={daysOverdueLabel} />
          <DetailRow label={detailPanel.fields.paymentMethod} value={record.paymentMethod} />
          {record.gocardlessId ? (
            <DetailRow label={detailPanel.fields.gocardlessId} value={record.gocardlessId} />
          ) : null}
          <DetailRow label={detailPanel.fields.round} value={record.round} />
        </dl>
      </section>

      <section>
        <h3 className="text-[10px] font-bold tracking-wider text-muted uppercase">
          {detailPanel.sections.nextCleanRisk}
        </h3>
        <dl className="mt-2 divide-y divide-border border-y border-border">
          <DetailRow label={detailPanel.fields.nextVisit} value={record.nextVisit} />
          <div className="flex items-center justify-between gap-3 py-2 text-xs">
            <dt className="text-muted">{detailPanel.fields.nextCleanBlocked}</dt>
            <dd
              className={cn(
                'inline-flex items-center gap-1 font-semibold',
                record.nextCleanBlocked ? 'text-danger' : 'text-success',
              )}
            >
              <DashboardIcon
                name={record.nextCleanBlocked ? 'x-circle' : 'check-circle'}
                className="h-3.5 w-3.5"
              />
              {record.nextCleanBlocked ? detailPanel.blockedYes : detailPanel.blockedNo}
            </dd>
          </div>
        </dl>
      </section>

      <section>
        <h3 className="text-[10px] font-bold tracking-wider text-muted uppercase">
          {detailPanel.sections.contact}
        </h3>
        <div className="mt-2 space-y-2 text-xs">
          <p className="inline-flex items-center gap-1.5 font-medium text-foreground">
            <DashboardIcon name="phone" className="h-3.5 w-3.5 text-muted" />
            {record.phone}
          </p>
          <p className="inline-flex items-center gap-1.5 font-medium text-foreground">
            <DashboardIcon name="mail" className="h-3.5 w-3.5 text-muted" />
            {record.email}
          </p>
          <p className="text-muted">
            {record.lastContact
              ? lastContactLabel.replace('{when}', record.lastContact)
              : `${detailPanel.fields.lastContact}: ${contactLabels['not-contacted']}`}
          </p>
        </div>
      </section>

      <section>
        <h3 className="text-[10px] font-bold tracking-wider text-muted uppercase">
          {detailPanel.sections.recentVisits}
        </h3>
        <ul className="mt-2 space-y-1.5">
          {record.recentVisits.map((visit) => (
            <li
              key={`${visit.date}-${visit.amount}-${visit.paymentStatus}`}
              className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-2.5 py-2 text-xs"
            >
              <div>
                <p className="font-medium text-foreground">{visit.date}</p>
                <p className="text-[10px] text-muted">{detailPanel.completedVisit}</p>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-foreground">{visit.amount}</span>
                <span
                  className={cn(
                    'rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
                    visit.paymentStatus === 'paid'
                      ? 'bg-success/10 text-success'
                      : 'bg-danger/10 text-danger',
                  )}
                >
                  {detailPanel.visitPayment[visit.paymentStatus]}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </SidePanel>
  )
}

function StatBox({
  value,
  label,
  tone,
}: {
  value: string
  label: string
  tone: 'danger' | 'warning' | 'default'
}) {
  const toneClass = {
    danger: 'border-danger/20 bg-danger/5 text-danger',
    warning: 'border-warning-border bg-warning-surface text-warning',
    default: 'border-border bg-surface text-foreground',
  } as const

  const labelClass = {
    danger: 'text-danger/70',
    warning: 'text-warning/80',
    default: 'text-muted',
  } as const

  return (
    <div className={cn('rounded-xl border px-2 py-2.5 text-center', toneClass[tone])}>
      <p className="text-sm font-bold leading-tight tracking-tight">{value}</p>
      <p className={cn('mt-0.5 text-[10px] font-medium', labelClass[tone])}>{label}</p>
    </div>
  )
}

function DetailRow({
  label,
  value,
  valueClassName,
}: {
  label: string
  value: string
  valueClassName?: string
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 text-xs">
      <dt className="text-muted">{label}</dt>
      <dd className={cn('text-right font-semibold text-foreground', valueClassName)}>{value}</dd>
    </div>
  )
}

function ActionCard({
  icon,
  label,
  onClick,
  tone = 'default',
}: {
  icon: string
  label: string
  onClick: () => void
  tone?: 'default' | 'warning' | 'success'
}) {
  const toneClass = {
    default: 'border-border text-foreground hover:bg-card/80',
    warning: 'border-warning/50 text-warning hover:bg-warning-surface/80',
    success: 'border-success/30 text-success hover:bg-success/5',
  } as const

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex min-h-[3.75rem] flex-col items-center justify-center gap-1 rounded-xl border bg-card px-2.5 py-2.5 text-xs font-medium shadow-sm transition-colors',
        toneClass[tone],
      )}
    >
      <DashboardIcon name={icon} className="h-4 w-4" />
      <span>{label}</span>
    </button>
  )
}
