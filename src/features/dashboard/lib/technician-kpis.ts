import type { DashboardTechnicianKpi } from '@/api/dashboard.api'
import type { KpiMetric } from '@/content/dashboard'
import { dashboardContent } from '@/content/dashboard'

const NOT_AVAILABLE = '—'

function money(value: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value)
}

/** 95 → "1h 35m", 40 → "40m", 120 → "2h". */
export function formatMinutes(minutes: number): string {
  const rounded = Math.round(minutes)
  const hours = Math.floor(rounded / 60)
  const rest = rounded % 60
  if (hours === 0) return `${rest}m`
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`
}

/** Total time on job across the rows that have timed visits; null when none do. */
export function totalTimeOnJob(rows: readonly DashboardTechnicianKpi[]): number | null {
  const timed = rows.filter((row) => row.timeOnJobMinutes != null)
  return timed.length === 0 ? null : timed.reduce((sum, row) => sum + (row.timeOnJobMinutes as number), 0)
}

/** Revenue per hour weighted by each technician's time on job; null without timed visits. */
export function weightedRevenuePerHour(rows: readonly DashboardTechnicianKpi[]): number | null {
  const timed = rows.filter((row) => row.revenuePerHour != null && (row.timeOnJobMinutes ?? 0) > 0)
  if (timed.length === 0) return null
  const minutes = timed.reduce((sum, row) => sum + (row.timeOnJobMinutes as number), 0)
  const weighted = timed.reduce(
    (sum, row) => sum + (row.revenuePerHour as number) * (row.timeOnJobMinutes as number),
    0,
  )
  return Math.round((weighted / minutes) * 100) / 100
}

function countTile(label: string, value: number): KpiMetric {
  const { tiles } = dashboardContent.kpis
  return {
    label,
    value: String(value),
    detail: value > 0 ? tiles.requiresReview : tiles.allClear,
    tone: value > 0 ? 'warning' : 'success',
  }
}

/**
 * Technician KPI tiles (GAP-025), summed over the selected technicians (empty selection = all).
 * Time on job and revenue per hour are computed by the API; `null` = no timed visit → "—".
 */
export function technicianKpisToTiles(
  rows: DashboardTechnicianKpi[] | undefined,
  selectedIds: ReadonlySet<string>,
): KpiMetric[] {
  const { tiles } = dashboardContent.kpis
  if (!Array.isArray(rows)) {
    return [
      tiles.jobsCompleted,
      tiles.valueCompleted,
      tiles.openComplaints,
      tiles.issues,
      tiles.timeOnJob,
      tiles.revenuePerHour,
      tiles.strikes,
      tiles.damages,
      tiles.upsells,
    ].map((label) => ({ label, value: NOT_AVAILABLE, detail: '' }))
  }

  const selected = selectedIds.size === 0 ? rows : rows.filter((row) => selectedIds.has(row.technicianId))
  const sum = (pick: (row: DashboardTechnicianKpi) => number | undefined) =>
    selected.reduce((total, row) => total + (pick(row) ?? 0), 0)
  const scope =
    selected.length === rows.length
      ? tiles.scopeAll
      : selected.map((row) => (row.technicianName ?? '').split(' ')[0]).join(', ')

  const timeOnJob = totalTimeOnJob(selected)
  const revenuePerHour = weightedRevenuePerHour(selected)
  const upsellValue = sum((row) => row.upsellValue)

  return [
    { label: tiles.jobsCompleted, value: String(sum((row) => row.jobsCompleted)), detail: scope },
    { label: tiles.valueCompleted, value: money(sum((row) => row.valueCompleted)), detail: scope, tone: 'success' },
    countTile(tiles.openComplaints, sum((row) => row.openComplaints)),
    countTile(tiles.issues, sum((row) => row.issueCount)),
    {
      label: tiles.timeOnJob,
      value: timeOnJob == null ? NOT_AVAILABLE : formatMinutes(timeOnJob),
      detail: timeOnJob == null ? tiles.noData : scope,
    },
    {
      label: tiles.revenuePerHour,
      value: revenuePerHour == null ? NOT_AVAILABLE : money(revenuePerHour),
      detail: revenuePerHour == null ? tiles.noData : scope,
      tone: revenuePerHour == null ? 'default' : 'success',
    },
    countTile(tiles.strikes, sum((row) => row.strikes)),
    countTile(tiles.damages, sum((row) => row.damages)),
    {
      label: tiles.upsells,
      value: String(sum((row) => row.upsells)),
      detail: tiles.upsellValue.replace('{value}', money(upsellValue)),
      tone: upsellValue > 0 ? 'success' : 'default',
    },
  ]
}
