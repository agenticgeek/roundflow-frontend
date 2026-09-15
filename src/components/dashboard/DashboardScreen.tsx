import { useMemo } from 'react'
import type { DashboardAlertId } from '@/content/dashboard'
import { dashboardContent } from '@/content/dashboard'
import type { DashboardInteractions } from '@/hooks/use-dashboard-interactions'
import { DashboardAlertRow, DashboardMetricGrid } from '@/components/dashboard/DashboardCards'
import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
import { GpsTrackingPanel } from '@/components/dashboard/GpsTrackingPanel'
import { TechnicianKpis } from '@/components/dashboard/TechnicianKpis'
import { TodayRoundsTable } from '@/components/dashboard/TodayRoundsTable'
import { PanelCard } from '@/components/dashboard/DashboardControls'
import { dashboardCtaClass } from '@/components/dashboard/dashboard-styles'
import { WorkspaceSetupCard } from '@/components/setup-wizard/WorkspaceSetupCard'
import {
  useDashboardAlerts,
  useDashboardCharts,
  useDashboardKpis,
  useDashboardRounds,
  useDashboardTechnicianKpis,
  useRefreshDashboard,
} from '@/features/dashboard/hooks/useDashboard'
import {
  alertsToCards,
  chartsToBars,
  kpisToMetrics,
  roundsToRows,
  technicianKpisToTiles,
} from '@/features/dashboard/lib/mappers'
import { errorMessage } from '@/lib/errors'
import { cn } from '@/lib/utils'

interface DashboardScreenProps {
  interactions: DashboardInteractions
  onOpenAlert: (id: DashboardAlertId) => void
  onViewAllRounds: () => void
}

const todayFormatter = new Intl.DateTimeFormat('en-GB', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

const timeFormatter = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' })

/** Composes the dashboard — five independent GET /dashboard/* queries, UI state from the interactions hook. */
export function DashboardScreen({ interactions, onOpenAlert, onViewAllRounds }: DashboardScreenProps) {
  const { header, states, gps, todayRounds } = dashboardContent

  const kpisQuery = useDashboardKpis()
  const alertsQuery = useDashboardAlerts()
  const roundsQuery = useDashboardRounds()
  const technicianKpisQuery = useDashboardTechnicianKpis(interactions.period)
  const chartsQuery = useDashboardCharts(interactions.range)
  const refresh = useRefreshDashboard()

  const metrics = useMemo(() => kpisToMetrics(kpisQuery.data), [kpisQuery.data])
  const alerts = useMemo(() => alertsToCards(alertsQuery.data), [alertsQuery.data])
  const rounds = useMemo(() => roundsToRows(roundsQuery.data), [roundsQuery.data])
  const tiles = useMemo(
    () => technicianKpisToTiles(technicianKpisQuery.data, interactions.selectedTechnicianIds),
    [interactions.selectedTechnicianIds, technicianKpisQuery.data],
  )
  const charts = useMemo(() => chartsToBars(chartsQuery.data), [chartsQuery.data])

  const queries = [kpisQuery, alertsQuery, roundsQuery, technicianKpisQuery, chartsQuery]
  const refreshing = queries.some((query) => query.isFetching)
  const failed = queries.find((query) => query.isError)
  const lastUpdatedAt = Math.max(...queries.map((query) => query.dataUpdatedAt))
  const lastUpdated =
    lastUpdatedAt > 0
      ? `${header.lastUpdatedPrefix} ${timeFormatter.format(new Date(lastUpdatedAt))}`
      : header.notLoaded

  return (
    <div className="space-y-6">
      <DashboardHeader
        title={header.title}
        subtitle={header.subtitle}
        date={todayFormatter.format(new Date())}
        lastUpdated={lastUpdated}
        autoRefresh={header.autoRefresh}
        refreshLabel={header.refreshLabel}
        refreshing={refreshing}
        onRefresh={() => void refresh()}
      />

      <WorkspaceSetupCard />

      {failed ? (
        <PanelCard interactive={false} className="flex flex-wrap items-center justify-between gap-3 border-danger/30">
          <p className="text-sm text-danger">
            {states.error} {errorMessage(failed.error)}
          </p>
          <button type="button" onClick={() => void refresh()} className={cn(dashboardCtaClass, 'px-4 py-2')}>
            {states.retry}
          </button>
        </PanelCard>
      ) : null}

      <DashboardMetricGrid metrics={metrics} loading={kpisQuery.isLoading} />

      <DashboardAlertRow alerts={alerts} loading={alertsQuery.isLoading} onOpenAlert={onOpenAlert} />

      <GpsTrackingPanel
        title={gps.title}
        statusLabel={gps.statusLabel}
        mapTitle={gps.mapTitle}
        mapSubtitle={gps.mapSubtitle}
        mapCaption={gps.mapCaption}
        techniciansTitle={gps.techniciansTitle}
        technicians={gps.technicians}
        selectedTechnician={interactions.selectedGpsTechnician}
        onSelectTechnician={interactions.setSelectedGpsTechnician}
        comingSoon={gps.comingSoon}
      />

      <TechnicianKpis
        technicians={technicianKpisQuery.data ?? []}
        techniciansLoading={technicianKpisQuery.isLoading}
        selectedTechnicianIds={interactions.selectedTechnicianIds}
        onToggleTechnician={interactions.toggleTechnician}
        period={interactions.period}
        onPeriodChange={interactions.setPeriod}
        metrics={tiles}
        range={interactions.range}
        onRangeChange={interactions.setRange}
        valueChart={charts.value}
        issueChart={charts.issues}
        chartsLoading={chartsQuery.isLoading}
      />

      <TodayRoundsTable
        title={todayRounds.title}
        viewAll={todayRounds.viewAll}
        emptyLabel={todayRounds.empty}
        columns={todayRounds.columns}
        rows={rounds}
        loading={roundsQuery.isLoading}
        onViewAll={onViewAllRounds}
        onSelectRound={onViewAllRounds}
      />
    </div>
  )
}
