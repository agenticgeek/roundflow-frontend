import type {
  ComplaintRevisitItem,
  DashboardAlertId,
  FailedPaymentItem,
  SkippedJobItem,
} from '@/content/dashboard'
import { dashboardContent } from '@/content/dashboard'
import { DashboardIcon } from '@/components/dashboard/DashboardIcon'
import { toneBgClass, toneTextClass } from '@/components/dashboard/dashboard-styles'
import { Modal } from '@/components/ui/modal'
import { site } from '@/content/site'
import { cn } from '@/lib/utils'

interface DashboardAlertModalProps {
  alertId: DashboardAlertId | null
  onClose: () => void
}

const priorityClass: Record<ComplaintRevisitItem['priority'], string> = {
  High: 'border-danger/30 bg-danger/10 text-danger',
  Medium: 'border-warning-border bg-warning-surface text-warning',
  Low: 'border-border bg-surface text-muted',
}

function ModalHeaderBar({
  title,
  summary,
  tone,
  onClose,
}: {
  title: string
  summary: string
  tone: 'warning' | 'danger'
  onClose: () => void
}) {
  return (
    <div
      className={cn(
        'relative flex items-center justify-between gap-3 py-3 pl-4 pr-12 sm:pl-5 sm:pr-14',
        toneBgClass(tone),
      )}
    >
      <h3 className={cn('min-w-0 text-sm font-medium sm:text-base', toneTextClass(tone))}>{title}</h3>
      <p className={cn('shrink-0 text-xs font-medium whitespace-nowrap sm:text-sm', toneTextClass(tone))}>
        {summary}
      </p>
      <button
        type="button"
        onClick={onClose}
        aria-label={site.ui.closeDialog}
        className="absolute top-1/2 right-3 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted transition-colors hover:bg-background/80 hover:text-foreground sm:right-4"
      >
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5" aria-hidden="true">
          <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 1 0-1.06-1.06L10 8.94 6.28 5.22Z" />
        </svg>
      </button>
    </div>
  )
}

function SkippedJobRow({ item }: { item: SkippedJobItem }) {
  return (
    <li className="flex gap-3 px-4 py-3 sm:px-5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-warning-surface text-warning">
        <DashboardIcon name="skip" className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">{item.address}</p>
            <p className="mt-0.5 text-xs text-muted">
              {item.customer} · {item.round}
            </p>
          </div>
          <p className="shrink-0 text-xs font-medium text-muted">{item.technician}</p>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full border border-warning-border bg-warning-surface px-2 py-0.5 text-[11px] font-medium text-warning">
            <DashboardIcon name="alert" className="h-3 w-3" />
            {item.reason}
          </span>
          <span className="inline-flex items-center gap-1 text-[11px] text-muted">
            <DashboardIcon name="clock" className="h-3 w-3" />
            {item.time}
          </span>
        </div>
      </div>
    </li>
  )
}

function FailedPaymentRow({ item }: { item: FailedPaymentItem }) {
  return (
    <li className="flex gap-3 px-4 py-3 sm:px-5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-danger/10 text-danger">
        <DashboardIcon name="card" className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">{item.customer}</p>
            <p className="mt-0.5 text-xs text-muted">{item.address}</p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-sm font-medium text-danger">{item.amount}</p>
            <p className="mt-0.5 text-[11px] text-muted">{item.attempts}</p>
          </div>
        </div>
      </div>
    </li>
  )
}

function ComplaintRevisitRow({ item }: { item: ComplaintRevisitItem }) {
  return (
    <li className="flex gap-3 px-4 py-3 sm:px-5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-danger/10 text-danger">
        <DashboardIcon name="message" className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium text-foreground">{item.customer}</p>
          <span
            className={cn(
              'rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide',
              priorityClass[item.priority],
            )}
          >
            {item.priority}
          </span>
        </div>
        <p className="mt-0.5 text-xs text-muted">{item.address}</p>
        <p className="mt-1 text-xs italic text-muted">&ldquo;{item.complaint}&rdquo;</p>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-muted">
          <span className="inline-flex items-center gap-1">
            <DashboardIcon name="technicians" className="h-3 w-3" />
            {item.technician}
          </span>
          <span className="inline-flex items-center gap-1">
            <DashboardIcon name="calendar" className="h-3 w-3" />
            {item.dueDate}
          </span>
        </div>
      </div>
    </li>
  )
}

function ModalFooterAction({ label }: { label: string }) {
  return (
    <button
      type="button"
      className="flex w-full items-center justify-center gap-2 border-t border-border bg-accent-surface px-4 py-3.5 text-sm font-medium text-accent transition-colors hover:bg-accent/10"
    >
      {label}
      <DashboardIcon name="arrow-right" className="h-4 w-4" />
    </button>
  )
}

/** Detail modal for dashboard alert cards — skipped jobs, failed payments, complaint revisits. */
export function DashboardAlertModal({ alertId, onClose }: DashboardAlertModalProps) {
  if (!alertId) return null

  const alert = dashboardContent.alerts.find((item) => item.id === alertId)

  if (!alert) return null

  const tone = alert.tone === 'warning' ? 'warning' : 'danger'

  if (alertId === 'skipped') {
    const modalContent = dashboardContent.alertModals.skipped

    return (
      <Modal
        open
        onClose={onClose}
        title={modalContent.title}
        showHeader={false}
        size="compact"
        maxWidthClass="max-w-xl"
        className="overflow-hidden p-0"
        bodyClassName="p-0"
      >
        <ModalHeaderBar
          title={modalContent.title}
          summary={modalContent.summary}
          tone={tone}
          onClose={onClose}
        />
        <ul className="divide-y divide-border">
          {modalContent.items.map((item) => (
            <SkippedJobRow key={`${item.address}-${item.time}`} item={item} />
          ))}
        </ul>
        <ModalFooterAction label={modalContent.footerAction} />
      </Modal>
    )
  }

  if (alertId === 'failed-payments') {
    const modalContent = dashboardContent.alertModals['failed-payments']

    return (
      <Modal
        open
        onClose={onClose}
        title={modalContent.title}
        showHeader={false}
        size="compact"
        maxWidthClass="max-w-xl"
        className="overflow-hidden p-0"
        bodyClassName="p-0"
      >
        <ModalHeaderBar
          title={modalContent.title}
          summary={modalContent.summary}
          tone={tone}
          onClose={onClose}
        />
        <ul className="divide-y divide-border">
          {modalContent.items.map((item) => (
            <FailedPaymentRow key={`${item.customer}-${item.attempts}`} item={item} />
          ))}
        </ul>
        <ModalFooterAction label={modalContent.footerAction} />
      </Modal>
    )
  }

  const modalContent = dashboardContent.alertModals['complaint-revisits']

  return (
    <Modal
      open
      onClose={onClose}
      title={modalContent.title}
      showHeader={false}
      size="compact"
      maxWidthClass="max-w-xl"
      className="overflow-hidden p-0"
      bodyClassName="p-0"
    >
      <ModalHeaderBar
        title={modalContent.title}
        summary={modalContent.summary}
        tone={tone}
        onClose={onClose}
      />
      <ul className="divide-y divide-border">
        {modalContent.items.map((item) => (
          <ComplaintRevisitRow key={`${item.customer}-${item.dueDate}`} item={item} />
        ))}
      </ul>
      <ModalFooterAction label={modalContent.footerAction} />
    </Modal>
  )
}
