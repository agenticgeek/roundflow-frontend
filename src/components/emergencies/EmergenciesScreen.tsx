import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { EmergencyRow, EmergencyStatus } from '@/api/emergencies.api'
import type { EmergencyTab } from '@/content/emergencies'
import { emergenciesContent, emergencyStatusLabels } from '@/content/emergencies'
import { EmergencyDetailPanel } from '@/components/emergencies/EmergencyDetailPanel'
import { IconButton, PanelCard } from '@/components/dashboard/DashboardControls'
import { dashboardCtaClass, dashboardRowHoverClass } from '@/components/dashboard/dashboard-styles'
import { Skeleton } from '@/components/ui/skeleton'
import { useEmergencies } from '@/features/emergencies/hooks/useEmergencies'
import { formatRelativeTime, formatWindowEnd } from '@/features/emergencies/lib/format'
import { queryKeys } from '@/lib/query-keys'
import { errorMessage } from '@/lib/errors'
import { cn } from '@/lib/utils'

const statusClass: Record<EmergencyStatus, string> = {
  ACTIVE: 'bg-warning-surface text-warning',
  RESOLVED: 'bg-success/10 text-success',
}

function StatusBadge({ status }: { status: EmergencyStatus }) {
  return (
    <span className={cn('inline-flex rounded-lg px-2.5 py-1 text-xs font-semibold', statusClass[status])}>
      {emergencyStatusLabels[status]}
    </span>
  )
}

/** Emergency Notifications page — Active / Resolved / All over `GET /emergencies`. */
export function EmergenciesScreen() {
  const content = emergenciesContent
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<EmergencyTab>('ACTIVE')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const listQuery = useEmergencies(tab === 'ALL' ? undefined : tab)
  const rows = listQuery.data ?? []

  const emptyLabel =
    tab === 'ACTIVE' ? content.states.emptyActive : tab === 'RESOLVED' ? content.states.emptyResolved : content.states.emptyAll

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: queryKeys.emergencies.all })
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{content.header.title}</h1>
          <p className="mt-1 text-sm text-muted">{content.header.subtitle}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="inline-flex rounded-lg bg-accent-surface p-1">
            {content.tabs.map((item) => {
              const active = tab === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setTab(item.id)}
                  className={cn(
                    'rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors duration-150',
                    active ? 'bg-primary text-primary-foreground shadow-sm' : 'text-foreground hover:text-accent',
                  )}
                >
                  {item.label}
                </button>
              )
            })}
          </div>
          <IconButton icon="refresh" label={content.header.refresh} onClick={refresh} spinning={listQuery.isFetching} />
        </div>
      </header>

      {listQuery.isError ? (
        <PanelCard interactive={false} className="flex flex-wrap items-center justify-between gap-3 border-danger/30">
          <p className="text-sm text-danger">
            {content.states.error} {errorMessage(listQuery.error)}
          </p>
          <button type="button" onClick={refresh} className={cn(dashboardCtaClass, 'px-4 py-2')}>
            {content.states.retry}
          </button>
        </PanelCard>
      ) : null}

      <PanelCard interactive={false} className="overflow-hidden bg-card p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] border-collapse text-left">
            <thead>
              <tr className="border-b border-border bg-surface text-xs font-semibold tracking-wide text-muted uppercase">
                <th className="px-4 py-3 sm:px-5">{content.columns.technician}</th>
                <th className="px-4 py-3">{content.columns.round}</th>
                <th className="px-4 py-3">{content.columns.remainingStops}</th>
                <th className="px-4 py-3">{content.columns.lastLocation}</th>
                <th className="px-4 py-3">{content.columns.windowEnd}</th>
                <th className="px-4 py-3">{content.columns.reported}</th>
                <th className="px-4 py-3">{content.columns.status}</th>
                <th className="px-4 py-3">{content.columns.action}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {listQuery.isLoading ? (
                Array.from({ length: 3 }, (_, index) => (
                  <tr key={index}>
                    <td colSpan={8} className="px-5 py-4">
                      <Skeleton className="h-4 w-2/3" />
                    </td>
                  </tr>
                ))
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-10 text-center text-sm text-muted">
                    {emptyLabel}
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <EmergencyRowItem key={row.id} row={row} onView={() => setSelectedId(row.id)} />
                ))
              )}
            </tbody>
          </table>
        </div>
      </PanelCard>

      <EmergencyDetailPanel emergencyId={selectedId} onClose={() => setSelectedId(null)} />
    </div>
  )
}

function EmergencyRowItem({ row, onView }: { row: EmergencyRow; onView: () => void }) {
  return (
    <tr onClick={onView} className={cn('cursor-pointer text-sm text-foreground', dashboardRowHoverClass)}>
      <td className="px-4 py-4 font-semibold sm:px-5">{row.technicianName}</td>
      <td className="px-4 py-4">{row.roundName}</td>
      <td className="px-4 py-4 font-semibold">{row.remainingStops}</td>
      <td className="px-4 py-4 text-muted">{row.lastLocation || '—'}</td>
      <td className="px-4 py-4 text-muted">{formatWindowEnd(row.scheduledWindowEnd)}</td>
      <td className="px-4 py-4 text-muted">{formatRelativeTime(row.reportedAt)}</td>
      <td className="px-4 py-4">
        <StatusBadge status={row.status} />
      </td>
      <td className="px-4 py-4" onClick={(event) => event.stopPropagation()}>
        <button type="button" onClick={onView} className={cn(dashboardCtaClass, 'px-3 py-1.5 text-xs')}>
          {emergenciesContent.actions.view}
        </button>
      </td>
    </tr>
  )
}
