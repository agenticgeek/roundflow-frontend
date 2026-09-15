import type {
  DashboardAlerts,
  DashboardCharts,
  DashboardKpis,
  DashboardRoundRow,
  DashboardTechnicianKpi,
} from '@/api/dashboard.api'
import type {
  ChartBar,
  DashboardAlert,
  DashboardMetric,
  KpiMetric,
  TodayRound,
} from '@/content/dashboard'
import { dashboardContent } from '@/content/dashboard'

/** "£1,240" for whole amounts, "£1,240.50" otherwise. */
export function formatMoney(value: number | null | undefined): string {
  if (value == null) return '—'
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value)
}

const NOT_AVAILABLE = '—'

/** KPI cards — values stay "—" until the query resolves. */
export function kpisToMetrics(kpis: DashboardKpis | undefined): DashboardMetric[] {
  const { metrics } = dashboardContent
  const priority = kpis?.openComplaintsByPriority

  return [
    {
      label: metrics.jobsToday.label,
      value: kpis ? String(kpis.jobsScheduledToday) : NOT_AVAILABLE,
      description: metrics.jobsToday.description,
      icon: 'calendar',
    },
    {
      label: metrics.openComplaints.label,
      value: kpis ? String(kpis.openComplaints) : NOT_AVAILABLE,
      description: priority
        ? `${priority.high} high · ${priority.medium} medium · ${priority.low} low`
        : metrics.openComplaints.description,
      icon: 'flag',
      tone: kpis && kpis.openComplaints > 0 ? 'danger' : 'default',
    },
    {
      label: metrics.cleanUnpaid.label,
      value: kpis ? formatMoney(kpis.cleanUnpaidAmount) : NOT_AVAILABLE,
      description: kpis
        ? `${kpis.cleanUnpaidCount} ${kpis.cleanUnpaidCount === 1 ? 'customer' : 'customers'} outstanding`
        : metrics.cleanUnpaid.description,
      icon: 'alert',
      tone: kpis && kpis.cleanUnpaidAmount > 0 ? 'warning' : 'default',
    },
    {
      label: metrics.monthlyRevenue.label,
      value: kpis ? formatMoney(kpis.monthlyRevenue) : NOT_AVAILABLE,
      description: metrics.monthlyRevenue.description,
      icon: 'pound',
      tone: 'success',
    },
  ]
}

/** Alert cards — a count of 0 is styled neutral (nothing to action). */
export function alertsToCards(alerts: DashboardAlerts | undefined): DashboardAlert[] {
  const { alerts: copy } = dashboardContent
  const tone = (count: number | undefined, active: DashboardAlert['tone']): DashboardAlert['tone'] =>
    count && count > 0 ? active : 'default'

  return [
    {
      id: 'skipped',
      value: alerts?.skippedNeedingReview,
      label: copy.skipped.label,
      description: copy.skipped.description,
      icon: 'skip',
      tone: tone(alerts?.skippedNeedingReview, 'warning'),
    },
    {
      id: 'failed-payments',
      value: alerts?.failedPayments,
      label: copy.failedPayments.label,
      description: copy.failedPayments.description,
      icon: 'card',
      tone: tone(alerts?.failedPayments, 'danger'),
    },
    {
      id: 'complaint-revisits',
      value: alerts?.complaintRevisitsDue,
      label: copy.complaintRevisits.label,
      description: copy.complaintRevisits.description,
      icon: 'message',
      tone: tone(alerts?.complaintRevisitsDue, 'danger'),
    },
  ]
}

export function roundsToRows(rows: DashboardRoundRow[] | undefined): TodayRound[] {
  return (Array.isArray(rows) ? rows : []).map((row) => ({
    id: row.roundId,
    round: row.roundName,
    technician: row.technicianName ?? '—',
    status: row.status,
    completed: row.completed,
    total: row.total,
    skipped: row.skipped,
    issues: row.issueCount,
    paymentHolds: row.paymentHolds,
    value: formatMoney(row.value),
    // etaMinutes is a Phase 2 stub (always null).
    eta: row.etaMinutes == null ? NOT_AVAILABLE : `~${row.etaMinutes} min`,
  }))
}

/**
 * Technician KPI tiles, summed over the selected technicians (empty selection = all).
 * Phase 2 stubs (time on job / strikes / damages / upsells) keep their slots and show "—".
 */
export function technicianKpisToTiles(
  rows: DashboardTechnicianKpi[] | undefined,
  selectedIds: ReadonlySet<string>,
): KpiMetric[] {
  const { tiles } = dashboardContent.kpis
  if (!Array.isArray(rows)) {
    return [
      { label: tiles.jobsCompleted, value: NOT_AVAILABLE, detail: '' },
      { label: tiles.valueCompleted, value: NOT_AVAILABLE, detail: '' },
      { label: tiles.openComplaints, value: NOT_AVAILABLE, detail: '' },
      { label: tiles.issues, value: NOT_AVAILABLE, detail: '' },
      ...phaseTwoTiles(),
    ]
  }

  const selected = selectedIds.size === 0 ? rows : rows.filter((row) => selectedIds.has(row.technicianId))
  const sum = (pick: (row: DashboardTechnicianKpi) => number) =>
    selected.reduce((total, row) => total + pick(row), 0)
  const scope =
    selected.length === rows.length
      ? tiles.scopeAll
      : selected.map((row) => row.technicianName.split(' ')[0]).join(', ')

  const openComplaints = sum((row) => row.openComplaints)
  const issues = sum((row) => row.issueCount)

  return [
    { label: tiles.jobsCompleted, value: String(sum((row) => row.jobsCompleted)), detail: scope },
    { label: tiles.valueCompleted, value: formatMoney(sum((row) => row.valueCompleted)), detail: scope, tone: 'success' },
    {
      label: tiles.openComplaints,
      value: String(openComplaints),
      detail: openComplaints > 0 ? tiles.requiresReview : tiles.allClear,
      tone: openComplaints > 0 ? 'warning' : 'success',
    },
    {
      label: tiles.issues,
      value: String(issues),
      detail: issues > 0 ? tiles.requiresReview : tiles.allClear,
      tone: issues > 0 ? 'warning' : 'success',
    },
    ...phaseTwoTiles(),
  ]
}

function phaseTwoTiles(): KpiMetric[] {
  const { tiles } = dashboardContent.kpis
  return [
    { label: tiles.timeOnJob, value: NOT_AVAILABLE, detail: tiles.notAvailable },
    { label: tiles.strikes, value: NOT_AVAILABLE, detail: tiles.notAvailable },
    { label: tiles.damages, value: NOT_AVAILABLE, detail: tiles.notAvailable },
    { label: tiles.upsells, value: NOT_AVAILABLE, detail: tiles.notAvailable },
  ]
}

/** Month arrays are positionally aligned — zip them into chart bars. */
export function chartsToBars(charts: DashboardCharts | undefined): { value: ChartBar[]; issues: ChartBar[] } {
  if (!charts || !Array.isArray(charts.months)) return { value: [], issues: [] }
  return {
    value: charts.months.map((label, index) => ({ label, value: charts.valueCompleted[index] ?? 0 })),
    issues: charts.months.map((label, index) => ({ label, value: charts.issueCount[index] ?? 0 })),
  }
}
