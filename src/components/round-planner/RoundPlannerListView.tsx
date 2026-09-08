import type { PlannerVisitStatus } from '@/content/round-planner'
import { plannerVisitStatusLabels, roundPlannerContent } from '@/content/round-planner'
import type { PlannerListStop } from '@/features/rounds/lib/planner'
import { formatLongDate, formatTime } from '@/features/rounds/lib/planner'
import { DashboardIcon } from '@/components/dashboard/DashboardIcon'
import { IconButton, PanelCard } from '@/components/dashboard/DashboardControls'
import { dashboardRowHoverClass, dashboardCtaClass } from '@/components/dashboard/dashboard-styles'
import { Skeleton } from '@/components/ui/skeleton'
import { cn, formatCurrency } from '@/lib/utils'

interface RoundPlannerListViewProps {
  stops: readonly PlannerListStop[]
  selectedDate: string
  minDate: string
  maxDate: string
  onDateChange: (date: string) => void
  onPreviousDay: () => void
  onNextDay: () => void
  expandedStopId: string | null
  onToggleStop: (visitId: string) => void
  onViewDetails: (propertyId: string) => void
  onBulkMessage: () => void
  onAddOneOffJob: () => void
  canMutate: boolean
  currency: string
  loading: boolean
  /** True when the day has visits but the active filters hide them all. */
  filteredOut: boolean
}

const statusClass: Record<PlannerVisitStatus, string> = {
  COMPLETED: 'bg-success/10 text-success',
  IN_PROGRESS: 'bg-primary/10 text-primary',
  SCHEDULED: 'bg-accent-surface text-accent',
  SKIPPED: 'bg-surface text-muted',
}

function visitStatus(value: string): PlannerVisitStatus {
  return value in plannerVisitStatusLabels ? (value as PlannerVisitStatus) : 'SCHEDULED'
}

/** List tab — a day's stops in route order, with expandable row details. */
export function RoundPlannerListView({
  stops,
  selectedDate,
  minDate,
  maxDate,
  onDateChange,
  onPreviousDay,
  onNextDay,
  expandedStopId,
  onToggleStop,
  onViewDetails,
  onBulkMessage,
  onAddOneOffJob,
  canMutate,
  currency,
  loading,
  filteredOut,
}: RoundPlannerListViewProps) {
  const { listView } = roundPlannerContent
  const { actions, columns } = listView

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center rounded-lg bg-accent-surface p-0.5">
            <IconButton
              icon="chevron-left"
              label={actions.previousDay}
              onClick={onPreviousDay}
              className={selectedDate <= minDate ? 'pointer-events-none opacity-40' : undefined}
            />
            <label className="flex items-center gap-2 px-2 text-xs font-semibold text-foreground">
              <span className="sr-only">{listView.dateLabel}</span>
              <span>{formatLongDate(selectedDate)}</span>
              <input
                type="date"
                value={selectedDate}
                min={minDate}
                max={maxDate}
                onChange={(event) => {
                  if (event.target.value) onDateChange(event.target.value)
                }}
                className="w-7 cursor-pointer rounded-md border border-border bg-background text-transparent [color-scheme:light] focus:outline-none"
                aria-label={listView.dateLabel}
              />
            </label>
            <IconButton
              icon="chevron-right"
              label={actions.nextDay}
              onClick={onNextDay}
              className={selectedDate >= maxDate ? 'pointer-events-none opacity-40' : undefined}
            />
          </div>
          <p className="hidden text-xs text-muted sm:block">{listView.routeOrderHint}</p>
        </div>

        {canMutate ? (
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={onBulkMessage} className={dashboardCtaClass}>
              <DashboardIcon name="message" className="h-4 w-4" />
              {actions.bulkMessage}
            </button>
            <button type="button" onClick={onAddOneOffJob} className={dashboardCtaClass}>
              <DashboardIcon name="calendar" className="h-4 w-4" />
              {actions.addOneOffJob}
            </button>
          </div>
        ) : null}
      </div>

      <PanelCard interactive={false} className="overflow-hidden bg-card p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] border-collapse text-left">
            <thead>
              <tr className="border-b border-border bg-surface text-xs font-semibold tracking-wide text-muted uppercase">
                <th className="w-14 px-4 py-3 sm:px-5" aria-label="Order" />
                <th className="px-4 py-3 sm:px-5">{columns.property}</th>
                <th className="px-4 py-3">{columns.round}</th>
                <th className="px-4 py-3">{columns.price}</th>
                <th className="px-4 py-3">{columns.status}</th>
                <th className="px-4 py-3">{columns.technician}</th>
                <th className="px-4 py-3">{columns.completedAt}</th>
                <th className="px-4 py-3">{columns.action}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 4 }, (_, index) => (
                  <tr key={index} className="border-b border-border">
                    <td colSpan={8} className="px-5 py-4">
                      <Skeleton className="h-4 w-2/3" />
                    </td>
                  </tr>
                ))
              ) : stops.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-10 text-center text-sm text-muted">
                    {filteredOut ? listView.emptyLabel : listView.noVisits}
                  </td>
                </tr>
              ) : (
                stops.map((stop, index) => (
                  <ListRow
                    key={stop.visitId}
                    stop={stop}
                    index={index}
                    expanded={expandedStopId === stop.visitId}
                    currency={currency}
                    onToggle={() => onToggleStop(stop.visitId)}
                    onViewDetails={onViewDetails}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </PanelCard>
    </div>
  )
}

function ListRow({
  stop,
  index,
  expanded,
  currency,
  onToggle,
  onViewDetails,
}: {
  stop: PlannerListStop
  index: number
  expanded: boolean
  currency: string
  onToggle: () => void
  onViewDetails: (propertyId: string) => void
}) {
  const { listView } = roundPlannerContent
  const { badges, details } = listView
  const status = visitStatus(stop.status)
  const completedAt = formatTime(stop.completedAt)

  return (
    <>
      <tr
        onClick={onToggle}
        className={cn(
          'cursor-pointer border-b border-border text-sm text-foreground',
          dashboardRowHoverClass,
          expanded && 'bg-primary/5',
        )}
      >
        <td className="px-4 py-4 sm:px-5">
          <span className="text-xs font-medium text-muted">{index + 1}</span>
        </td>
        <td className="px-4 py-4 sm:px-5">
          <p className="font-semibold text-foreground">{stop.addressLine}</p>
          <p className="mt-0.5 text-xs text-muted">{stop.customerName}</p>
          {stop.paymentHold || stop.issues.length > 0 ? (
            <p className="mt-1.5 flex flex-wrap gap-1.5">
              {stop.paymentHold ? (
                <span className="rounded-md bg-warning-surface px-1.5 py-0.5 text-[10px] font-semibold text-warning">
                  {badges.paymentHold}
                </span>
              ) : null}
              {stop.issues.length > 0 ? (
                <span
                  title={stop.issues[0]?.note ?? undefined}
                  className="rounded-md bg-danger/10 px-1.5 py-0.5 text-[10px] font-semibold text-danger"
                >
                  {badges.issue}
                  {stop.issues.length > 1 ? ` ×${stop.issues.length}` : ''}
                </span>
              ) : null}
            </p>
          ) : null}
        </td>
        <td className="px-4 py-4 text-muted">{stop.roundName}</td>
        <td className="px-4 py-4 font-semibold">{formatCurrency(stop.price, currency)}</td>
        <td className="px-4 py-4">
          <span className={cn('inline-flex rounded-lg px-2.5 py-1 text-xs font-semibold', statusClass[status])}>
            {plannerVisitStatusLabels[status]}
          </span>
        </td>
        <td className="px-4 py-4">{stop.technicianName ?? listView.unassigned}</td>
        <td className="px-4 py-4 text-muted">{completedAt ?? '—'}</td>
        <td className="px-4 py-4" onClick={(event) => event.stopPropagation()}>
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={expanded}
            className="inline-flex items-center gap-1.5 rounded-lg p-1.5 text-muted transition-colors hover:bg-surface hover:text-foreground"
          >
            <DashboardIcon
              name="chevron-down"
              className={cn('h-4 w-4 transition-transform', expanded && 'rotate-180')}
            />
          </button>
        </td>
      </tr>

      {expanded ? (
        <tr className="border-b border-border bg-accent-surface/60">
          <td colSpan={8} className="px-4 py-5 sm:px-5">
            <div className="grid animate-fade-in-up gap-6 md:grid-cols-2">
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-foreground">{details.title}</h3>
                <dl className="space-y-2 text-sm">
                  {stop.propertyName ? <DetailRow label={details.propertyName} value={stop.propertyName} /> : null}
                  <DetailRow label={details.postcode} value={stop.postcode} />
                  <DetailRow label={details.completedAt} value={completedAt ?? '—'} />
                </dl>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation()
                    onViewDetails(stop.propertyId)
                  }}
                  className={cn(dashboardCtaClass, 'mt-2')}
                >
                  {details.viewFull}
                </button>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-medium text-foreground">{details.issues}</h3>
                {stop.issues.length === 0 ? (
                  <p className="text-sm text-muted">{details.noIssues}</p>
                ) : (
                  <ul className="space-y-2 text-sm">
                    {stop.issues.map((issue) => (
                      <li key={issue.id} className="flex gap-2">
                        <span className="shrink-0 font-semibold text-danger">{issue.type}:</span>
                        <span className="text-foreground">{issue.note ?? '—'}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </td>
        </tr>
      ) : null}
    </>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <dt className="shrink-0 text-muted">{label}</dt>
      <dd className="text-foreground">{value}</dd>
    </div>
  )
}
