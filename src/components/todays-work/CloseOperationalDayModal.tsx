import { useEffect, useMemo, useState } from 'react'
import type {
  CloseDaySummaryCard,
  CloseDaySummaryCardTone,
  CloseDayUnfinishedOption,
  CloseDayUnfinishedOptionId,
} from '@/content/todays-work'
import { todaysWorkContent } from '@/content/todays-work'
import type { TodayKpi } from '@/api/today.api'
import { DashboardIcon } from '@/components/dashboard/DashboardIcon'
import {
  Modal,
  ModalButton,
  ModalFooter,
  modalInfoPanelClass,
  modalWarningPanelClass,
} from '@/components/ui/modal'
import { useToast } from '@/components/ui/toast'
import { useCloseToday } from '@/features/today/hooks/useToday'
import { formatMoney } from '@/features/today/lib/mappers'
import { useAppBootstrap } from '@/providers/AppBootstrapProvider'
import { ApiError } from '@/lib/errors'
import { cn } from '@/lib/utils'

type CloseDayStep = 'review' | 'confirm'

interface CloseOperationalDayModalProps {
  open: boolean
  dateLabel: string
  kpi?: TodayKpi
  onClose: () => void
}

function unfinishedCountFromKpi(kpi?: TodayKpi) {
  if (!kpi) return 0
  return Math.max(0, kpi.totalStops - kpi.completed - kpi.skipped)
}

function summaryCardsFromKpi(kpi?: TodayKpi): CloseDaySummaryCard[] {
  const unfinished = unfinishedCountFromKpi(kpi)
  return [
    {
      id: 'completed',
      label: 'Completed Jobs',
      value: String(kpi?.completed ?? 0),
      tone: 'primary',
      icon: 'check-circle',
    },
    {
      id: 'skipped',
      label: 'Skipped Jobs',
      value: String(kpi?.skipped ?? 0),
      tone: 'warning',
      icon: 'x-circle',
    },
    {
      id: 'outstanding',
      label: 'Outstanding',
      value: String(unfinished),
      tone: 'danger',
      icon: 'alert-circle',
    },
    { id: 'issues', label: 'Issues', value: String(kpi?.issues ?? 0), tone: 'default' },
    {
      id: 'payment-holds',
      label: 'Payment Holds',
      value: String(kpi?.paymentHolds ?? 0),
      tone: 'default',
    },
    {
      id: 'revenue',
      label: 'Revenue',
      value: formatMoney(kpi?.valueCompleted ?? 0),
      tone: 'default',
    },
  ]
}

/** Multi-step close-of-day workflow — POST /today/close. */
export function CloseOperationalDayModal({
  open,
  dateLabel,
  kpi,
  onClose,
}: CloseOperationalDayModalProps) {
  const { closeOperationalDayModal } = todaysWorkContent
  const { showToast } = useToast()
  const { canMutate } = useAppBootstrap()
  const closeToday = useCloseToday()
  const [step, setStep] = useState<CloseDayStep>('review')
  const [unfinishedOption, setUnfinishedOption] = useState<CloseDayUnfinishedOptionId | null>(null)
  const [confirmInfoOpen, setConfirmInfoOpen] = useState(false)

  const { unfinishedJobs, confirm, alerts } = closeOperationalDayModal
  const unfinishedCount = unfinishedCountFromKpi(kpi)
  const issuesCount = kpi?.issues ?? 0
  const summaryCards = useMemo(() => summaryCardsFromKpi(kpi), [kpi])

  useEffect(() => {
    if (!open) return
    setStep('review')
    setUnfinishedOption(unfinishedCount > 0 ? null : 'mark-as-skipped')
    setConfirmInfoOpen(false)
  }, [open, unfinishedCount])

  const unfinishedTitle = unfinishedJobs.title.replace('{count}', String(unfinishedCount))
  const unfinishedAlert = alerts.unfinished.replace('{count}', String(unfinishedCount))
  const issuesAlert = alerts.issues.replace('{count}', String(issuesCount))
  const closingDateLabel = closeOperationalDayModal.closingDateLabel.replace('{date}', dateLabel)
  const pushConfirmation = unfinishedJobs.pushConfirmation
    .replace('{count}', String(unfinishedCount))
    .replace('{schedule}', 'the next working day')
    .replace('{technician}', 'assigned technicians')

  function handleClose() {
    if (closeToday.isPending) return
    onClose()
  }

  function handleReviewPrimary() {
    if (unfinishedCount > 0 && !unfinishedOption) return
    setStep('confirm')
  }

  async function handleFinalConfirm() {
    if (!canMutate || closeToday.isPending) return
    const action =
      unfinishedOption === 'push-to-tomorrow' ? 'push_to_tomorrow' : 'mark_as_skipped'

    try {
      await closeToday.mutateAsync({ unfinishedAction: action })
      onClose()
      showToast(closeOperationalDayModal.successToast)
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        showToast('Day already closed')
        onClose()
        return
      }
      if (error instanceof ApiError && error.status === 400) return
      showToast(error instanceof Error ? error.message : 'Could not close the day')
    }
  }

  const reviewPrimaryLabel =
    unfinishedOption === 'push-to-tomorrow'
      ? closeOperationalDayModal.actions.pushToTomorrow
      : unfinishedOption === 'mark-as-skipped'
        ? closeOperationalDayModal.actions.markAsSkipped
        : closeOperationalDayModal.actions.closeDay

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={closeOperationalDayModal.title}
      subtitle={closeOperationalDayModal.subtitle}
      showCloseButton
      stacked
      size="compact"
      maxWidthClass="max-w-lg"
      className="max-h-[min(92dvh,52rem)]"
      headerClassName="pl-16"
      bodyClassName="space-y-4"
      footer={
        step === 'review' ? (
          <ModalFooter compact>
            <ModalButton compact variant="secondary" onClick={handleClose}>
              {closeOperationalDayModal.actions.cancel}
            </ModalButton>
            <ModalButton
              compact
              variant="primary"
              disabled={(unfinishedCount > 0 && !unfinishedOption) || !canMutate}
              onClick={handleReviewPrimary}
            >
              {reviewPrimaryLabel}
            </ModalButton>
          </ModalFooter>
        ) : (
          <ModalFooter compact>
            <ModalButton
              compact
              variant="secondary"
              disabled={closeToday.isPending}
              onClick={() => setStep('review')}
            >
              {closeOperationalDayModal.actions.cancel}
            </ModalButton>
            <ModalButton
              compact
              variant="primary"
              disabled={!canMutate || closeToday.isPending}
              onClick={() => void handleFinalConfirm()}
            >
              {closeToday.isPending ? 'Closing…' : closeOperationalDayModal.actions.closeDay}
            </ModalButton>
          </ModalFooter>
        )
      }
    >
      <span className="absolute top-4 left-5 flex h-9 w-9 items-center justify-center rounded-none bg-danger/10 text-danger">
        <DashboardIcon name="clock" className="h-5 w-5" />
      </span>

      {step === 'review' ? (
        <ReviewStep
          summaryTitle={closeOperationalDayModal.summaryTitle}
          summaryCards={summaryCards}
          unfinishedTitle={unfinishedTitle}
          unfinishedOptions={unfinishedJobs.options}
          unfinishedOption={unfinishedOption}
          onSelectUnfinished={setUnfinishedOption}
          pushConfirmation={pushConfirmation}
          unfinishedAlert={unfinishedAlert}
          issuesAlert={issuesAlert}
          reviewInfo={closeOperationalDayModal.reviewInfo}
          showUnfinishedChooser={unfinishedCount > 0}
        />
      ) : (
        <ConfirmStep
          closingDateLabel={closingDateLabel}
          unfinishedOption={unfinishedOption}
          confirm={confirm}
          completedLabel={`${kpi?.completed ?? 0} job${kpi?.completed === 1 ? '' : 's'}`}
          revenueLabel={formatMoney(kpi?.valueCompleted ?? 0)}
          issuesLabel={`${issuesCount} — require follow-up`}
          confirmInfoOpen={confirmInfoOpen}
          onToggleConfirmInfo={() => setConfirmInfoOpen((current) => !current)}
        />
      )}
    </Modal>
  )
}

function ReviewStep({
  summaryTitle,
  summaryCards,
  unfinishedTitle,
  unfinishedOptions,
  unfinishedOption,
  onSelectUnfinished,
  pushConfirmation,
  unfinishedAlert,
  issuesAlert,
  reviewInfo,
  showUnfinishedChooser,
}: {
  summaryTitle: string
  summaryCards: readonly CloseDaySummaryCard[]
  unfinishedTitle: string
  unfinishedOptions: readonly CloseDayUnfinishedOption[]
  unfinishedOption: CloseDayUnfinishedOptionId | null
  onSelectUnfinished: (id: CloseDayUnfinishedOptionId) => void
  pushConfirmation: string
  unfinishedAlert: string
  issuesAlert: string
  reviewInfo: { title: string; items: readonly string[] }
  showUnfinishedChooser: boolean
}) {
  return (
    <>
      <section>
        <p className="mb-3 text-sm font-semibold text-foreground">{summaryTitle}</p>
        <div className="grid grid-cols-3 gap-2">
          {summaryCards.map((card) => (
            <SummaryCard key={card.id} card={card} />
          ))}
        </div>
      </section>

      {showUnfinishedChooser ? (
        <>
          <section className="space-y-2">
            <p className="text-sm font-semibold text-foreground">{unfinishedTitle}</p>
            {unfinishedOptions.map((option) => (
              <UnfinishedOption
                key={option.id}
                option={option}
                selected={unfinishedOption === option.id}
                onSelect={() => onSelectUnfinished(option.id)}
              />
            ))}
          </section>

          {unfinishedOption === 'push-to-tomorrow' ? (
            <div className="animate-fade-in flex gap-3 rounded-none border border-primary/25 bg-accent-surface px-4 py-3">
              <DashboardIcon name="calendar" className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <p className="text-sm font-medium text-primary">{pushConfirmation}</p>
            </div>
          ) : null}

          <div className={modalWarningPanelClass}>
            <div className="flex gap-2">
              <DashboardIcon name="alert-circle" className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
              <p>{unfinishedAlert}</p>
            </div>
          </div>
        </>
      ) : null}

      <div className="rounded-none border border-danger/25 bg-danger/5 px-4 py-3 text-sm text-danger">
        <div className="flex gap-2">
          <DashboardIcon name="alert-circle" className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{issuesAlert}</p>
        </div>
      </div>

      <div className={cn('text-sm text-muted', modalInfoPanelClass)}>
        <p className="mb-2 font-semibold text-foreground">{reviewInfo.title}</p>
        <ul className="list-disc space-y-1 pl-4">
          {reviewInfo.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    </>
  )
}

function ConfirmStep({
  closingDateLabel,
  unfinishedOption,
  confirm,
  completedLabel,
  revenueLabel,
  issuesLabel,
  confirmInfoOpen,
  onToggleConfirmInfo,
}: {
  closingDateLabel: string
  unfinishedOption: CloseDayUnfinishedOptionId | null
  confirm: typeof todaysWorkContent.closeOperationalDayModal.confirm
  completedLabel: string
  revenueLabel: string
  issuesLabel: string
  confirmInfoOpen: boolean
  onToggleConfirmInfo: () => void
}) {
  const unfinishedLabel = unfinishedOption
    ? confirm.unfinishedLabels[unfinishedOption]
    : confirm.unfinishedLabels['mark-as-skipped']

  return (
    <>
      <p className="flex items-center gap-2 text-sm text-muted">
        <DashboardIcon name="calendar" className="h-4 w-4 shrink-0" />
        {closingDateLabel}
      </p>

      <div className="rounded-none border border-border bg-card">
        <ConfirmRow
          icon="check-circle"
          iconClass="text-success"
          label={confirm.rows.unfinishedJobs}
          value={unfinishedLabel}
        />
        <ConfirmRow
          icon="check-circle"
          iconClass="text-success"
          label={confirm.rows.completedToday}
          value={completedLabel}
        />
        <ConfirmRow
          icon="check-circle"
          iconClass="text-success"
          label={confirm.rows.revenueEarned}
          value={revenueLabel}
        />
        <ConfirmRow
          icon="alert"
          iconClass="text-danger"
          label={confirm.rows.activeIssues}
          value={issuesLabel}
          valueClass="text-danger"
          labelClass="text-danger"
        />
      </div>

      <section>
        <button
          type="button"
          onClick={onToggleConfirmInfo}
          className="flex w-full items-center gap-2 text-left text-sm font-semibold text-foreground"
        >
          <DashboardIcon
            name="chevron-right"
            className={cn('h-4 w-4 transition-transform', confirmInfoOpen && 'rotate-90')}
          />
          {confirm.infoTitle}
        </button>
        {confirmInfoOpen ? (
          <ul className="mt-2 list-disc space-y-1 pl-6 text-sm text-muted">
            {confirm.infoItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ) : null}
      </section>

      <div className="rounded-none border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
        <div className="flex gap-2">
          <DashboardIcon name="alert-circle" className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{confirm.warning}</p>
        </div>
      </div>
    </>
  )
}

function SummaryCard({ card }: { card: CloseDaySummaryCard }) {
  return (
    <div className={cn('rounded-none border px-3 py-3', summaryCardClass(card.tone))}>
      {card.icon ? (
        <DashboardIcon name={card.icon} className={cn('h-4 w-4', summaryIconClass(card.tone))} />
      ) : null}
      <p className={cn('mt-2 text-lg font-semibold', summaryValueClass(card.tone))}>{card.value}</p>
      <p className={cn('mt-0.5 text-[11px] font-medium', summaryLabelClass(card.tone))}>
        {card.label}
      </p>
    </div>
  )
}

function summaryCardClass(tone: CloseDaySummaryCardTone) {
  const classes: Record<CloseDaySummaryCardTone, string> = {
    primary: 'border-primary/25 bg-accent-surface',
    warning: 'border-warning-border bg-warning-surface',
    danger: 'border-danger/25 bg-danger/5',
    default: 'border-border bg-card',
  }
  return classes[tone]
}

function summaryIconClass(tone: CloseDaySummaryCardTone) {
  const classes: Record<CloseDaySummaryCardTone, string> = {
    primary: 'text-primary',
    warning: 'text-warning',
    danger: 'text-danger',
    default: 'text-muted',
  }
  return classes[tone]
}

function summaryValueClass(tone: CloseDaySummaryCardTone) {
  const classes: Record<CloseDaySummaryCardTone, string> = {
    primary: 'text-primary',
    warning: 'text-warning-foreground',
    danger: 'text-danger',
    default: 'text-foreground',
  }
  return classes[tone]
}

function summaryLabelClass(tone: CloseDaySummaryCardTone) {
  const classes: Record<CloseDaySummaryCardTone, string> = {
    primary: 'text-primary/80',
    warning: 'text-warning-foreground/80',
    danger: 'text-danger/80',
    default: 'text-muted',
  }
  return classes[tone]
}

function UnfinishedOption({
  option,
  selected,
  onSelect,
}: {
  option: CloseDayUnfinishedOption
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'flex w-full gap-3 rounded-none border px-4 py-3 text-left transition-colors',
        selected
          ? 'border-primary bg-accent-surface ring-1 ring-primary'
          : 'border-border bg-card hover:bg-surface',
      )}
    >
      <span
        className={cn(
          'mt-1 h-3.5 w-3.5 shrink-0 rounded-full border',
          selected ? 'border-primary bg-primary' : 'border-muted bg-muted/40',
        )}
        aria-hidden="true"
      />
      <span>
        <span className="block text-sm font-semibold text-foreground">{option.title}</span>
        <span className="mt-0.5 block text-xs text-muted">{option.description}</span>
      </span>
    </button>
  )
}

function ConfirmRow({
  icon,
  iconClass,
  label,
  value,
  valueClass,
  labelClass,
}: {
  icon: string
  iconClass: string
  label: string
  value: string
  valueClass?: string
  labelClass?: string
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 last:border-b-0">
      <div className="flex min-w-0 items-center gap-2">
        <DashboardIcon name={icon} className={cn('h-4 w-4 shrink-0', iconClass)} />
        <span className={cn('text-sm text-foreground', labelClass)}>{label}</span>
      </div>
      <span className={cn('shrink-0 text-sm font-semibold text-foreground', valueClass)}>
        {value}
      </span>
    </div>
  )
}
