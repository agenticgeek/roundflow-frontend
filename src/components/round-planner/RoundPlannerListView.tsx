import type { RoundPlannerListItem } from '@/content/round-planner'
import { roundPlannerContent } from '@/content/round-planner'
import { DashboardIcon } from '@/components/dashboard/DashboardIcon'
import { PanelCard } from '@/components/dashboard/DashboardControls'
import { dashboardRowHoverClass, dashboardCtaClass } from '@/components/dashboard/dashboard-styles'
import { cn } from '@/lib/utils'

interface RoundPlannerListViewProps {
  items: readonly RoundPlannerListItem[]
  expandedItemId: string | null
  onToggleItem: (itemId: string) => void
  onViewDetails: (propertyId: string) => void
  onBulkMessage: () => void
  onAddOneOffJob: () => void
  onRemoveProperty: (itemId: string) => void
}

const statusClass: Record<RoundPlannerListItem['status'], string> = {
  completed: 'bg-success/10 text-success',
  hold: 'bg-warning-surface text-warning',
  scheduled: 'bg-primary/10 text-primary',
}

const paymentClass: Record<RoundPlannerListItem['paymentStatus'], string> = {
  paid: 'bg-success/10 text-success',
  hold: 'bg-warning-surface text-warning',
  pending: 'bg-primary/10 text-primary',
}

/** List tab — sortable-style table with expandable row details. */
export function RoundPlannerListView({
  items,
  expandedItemId,
  onToggleItem,
  onViewDetails,
  onBulkMessage,
  onAddOneOffJob,
  onRemoveProperty,
}: RoundPlannerListViewProps) {
  const { listView } = roundPlannerContent
  const { actions, columns, emptyLabel } = listView

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-start gap-3">
        <button type="button" onClick={onBulkMessage} className={dashboardCtaClass}>
          <DashboardIcon name="message" className="h-4 w-4" />
          {actions.bulkMessage}
        </button>
        <button type="button" onClick={onAddOneOffJob} className={dashboardCtaClass}>
          <DashboardIcon name="calendar" className="h-4 w-4" />
          {actions.addOneOffJob}
        </button>
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
                <th className="px-4 py-3">{columns.lastCompleted}</th>
                <th className="px-4 py-3">{columns.action}</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-10 text-center text-sm text-muted">
                    {emptyLabel}
                  </td>
                </tr>
              ) : (
                items.map((item, index) => {
                  const expanded = expandedItemId === item.id

                  return (
                    <ListRow
                      key={item.id}
                      item={item}
                      index={index}
                      expanded={expanded}
                      onToggle={() => onToggleItem(item.id)}
                      onViewDetails={onViewDetails}
                      onRemoveProperty={onRemoveProperty}
                    />
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </PanelCard>
    </div>
  )
}

function ListRow({
  item,
  index,
  expanded,
  onToggle,
  onViewDetails,
  onRemoveProperty,
}: {
  item: RoundPlannerListItem
  index: number
  expanded: boolean
  onToggle: () => void
  onViewDetails: (propertyId: string) => void
  onRemoveProperty: (itemId: string) => void
}) {
  const { listView } = roundPlannerContent
  const { actions, details, notes, statusLabels } = listView

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
        <td className="px-4 py-4 sm:px-5" onClick={(event) => event.stopPropagation()}>
          <div className="flex items-center gap-2 text-muted">
            <button type="button" aria-label="Reorder" className="cursor-grab active:cursor-grabbing">
              <DashboardIcon name="grip" className="h-4 w-4" />
            </button>
            <span className="text-xs font-medium">{index + 1}</span>
          </div>
        </td>
        <td className="px-4 py-4 sm:px-5">
          <p className="font-semibold text-foreground">{item.address}</p>
          <p className="mt-0.5 text-xs text-muted">{item.customer}</p>
        </td>
        <td className="px-4 py-4 text-muted">{item.round}</td>
        <td className="px-4 py-4 font-semibold">{item.price}</td>
        <td className="px-4 py-4">
          <span
            className={cn(
              'inline-flex rounded-lg px-2.5 py-1 text-xs font-semibold capitalize',
              statusClass[item.status],
            )}
          >
            {statusLabels[item.status]}
          </span>
        </td>
        <td className="px-4 py-4">{item.technician}</td>
        <td className="px-4 py-4" onClick={(event) => event.stopPropagation()}>
          <button
            type="button"
            onClick={onToggle}
            className="inline-flex items-center gap-1.5 text-foreground transition-colors hover:text-primary"
          >
            <span>{item.lastCompleted}</span>
            <DashboardIcon
              name="chevron-down"
              className={cn('h-4 w-4 text-muted transition-transform', expanded && 'rotate-180')}
            />
          </button>
        </td>
        <td className="px-4 py-4" onClick={(event) => event.stopPropagation()}>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label={actions.removeProperty}
              title={actions.removeProperty}
              onClick={() => onRemoveProperty(item.id)}
              className="rounded-lg p-1.5 text-danger transition-colors hover:bg-danger/10"
            >
              <DashboardIcon name="trash" className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="More actions"
              className="rounded-lg p-1.5 text-muted transition-colors hover:bg-surface hover:text-foreground"
            >
              <DashboardIcon name="more-vertical" className="h-4 w-4" />
            </button>
          </div>
        </td>
      </tr>

      {expanded ? (
        <tr className="border-b border-border bg-accent-surface/60">
          <td colSpan={8} className="px-4 py-5 sm:px-5">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-foreground">{details.title}</h3>
                <dl className="space-y-2 text-sm">
                  <DetailRow label={details.frequency} value={item.frequency} />
                  <DetailRow label={details.nextDue} value={item.nextDue} />
                  <div className="flex items-center gap-2">
                    <dt className="text-muted">{details.payment}</dt>
                    <dd>
                      <span
                        className={cn(
                          'inline-flex rounded-md px-2 py-0.5 text-xs font-semibold capitalize',
                          paymentClass[item.paymentStatus],
                        )}
                      >
                        {statusLabels[item.paymentStatus]}
                      </span>
                    </dd>
                  </div>
                  <DetailRow label={details.method} value={item.paymentMethod} />
                </dl>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation()
                    onViewDetails(item.propertyId)
                  }}
                  className={cn(dashboardCtaClass, 'mt-2')}
                >
                  {details.viewFull}
                </button>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-medium text-foreground">{notes.title}</h3>
                <dl className="space-y-2 text-sm">
                  <DetailRow label={notes.access} value={item.access} />
                  {item.risk ? (
                    <div className="flex gap-2">
                      <dt className="shrink-0 font-semibold text-danger">{notes.risk}:</dt>
                      <dd className="text-foreground">{item.risk}</dd>
                    </div>
                  ) : null}
                </dl>
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
