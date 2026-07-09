import { dashboardContent } from '@/content/dashboard'
import type { DashboardInteractions } from '@/hooks/use-dashboard-interactions'
import { DashboardAlertModal } from '@/components/dashboard/DashboardAlertModal'
import { DashboardAlertRow, DashboardMetricGrid } from '@/components/dashboard/DashboardCards'
import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
import { GpsTrackingPanel } from '@/components/dashboard/GpsTrackingPanel'
import { TechnicianKpis } from '@/components/dashboard/TechnicianKpis'
import { TodayRoundsTable } from '@/components/dashboard/TodayRoundsTable'

interface DashboardScreenProps {
  interactions: DashboardInteractions
}

/** Composes all dashboard sections — data from content, state from the interactions hook. */
export function DashboardScreen({ interactions }: DashboardScreenProps) {
  const { header, metrics, alerts, gps, kpis, todayRounds } = dashboardContent

  return (
    <div className="space-y-6">
      <DashboardHeader
        title={header.title}
        subtitle={header.subtitle}
        date={header.date}
        lastUpdated={interactions.lastUpdated}
        autoRefresh={header.autoRefresh}
        refreshing={interactions.refreshing}
        onRefresh={interactions.refreshDashboard}
      />

      <DashboardMetricGrid metrics={metrics} />

      <DashboardAlertRow alerts={alerts} onOpenAlert={interactions.openAlertModal} />

      <DashboardAlertModal
        alertId={interactions.openAlertModalId}
        onClose={interactions.closeAlertModal}
      />

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
      />

      <TechnicianKpis
        title={kpis.title}
        subtitle={kpis.subtitle}
        filters={kpis.filters}
        periodOptions={kpis.period}
        period={interactions.period}
        onPeriodChange={interactions.setPeriod}
        selectedTechnicians={interactions.selectedTechnicians}
        onToggleTechnician={interactions.toggleTechnician}
        metrics={kpis.metrics}
        valueChartTitle={kpis.valueChartTitle}
        revenueChartTitle={kpis.revenueChartTitle}
        issuesChartTitle={kpis.issuesChartTitle}
        valueChart={interactions.scaledValueChart}
        revenueLine={interactions.scaledRevenueLine}
        issueChart={kpis.issueChart}
      />

      <TodayRoundsTable
        title={todayRounds.title}
        viewAll={todayRounds.viewAll}
        columns={todayRounds.columns}
        rows={todayRounds.rows}
      />
    </div>
  )
}
