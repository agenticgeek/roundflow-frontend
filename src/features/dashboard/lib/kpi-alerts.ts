import type { DashboardAlerts } from '@/api/dashboard.api'
import { technicianDetailPath } from '@/config/routes'
import { dashboardContent } from '@/content/dashboard'

export type KpiAlertRow = {
  id: string
  technicianName: string
  /** "Strikes 4 — above the 3 threshold". */
  line: string
  to: string
}

function formatValue(metric: string, value: number): string {
  return metric === 'revenuePerHour' ? `£${value.toFixed(2)}` : String(value)
}

/** `alerts.kpiAlerts` → one line per crossed threshold, linking to the technician (GAP-025). */
export function kpiAlertsToRows(alerts: DashboardAlerts | undefined): KpiAlertRow[] {
  const copy = dashboardContent.kpiAlerts
  return (alerts?.kpiAlerts ?? []).map((alert) => ({
    id: alert.id,
    technicianName: alert.technicianName ?? copy.unknownTechnician,
    line: copy.line
      .replace('{metric}', copy.metrics[alert.metric] ?? alert.metric)
      .replace('{value}', formatValue(alert.metric, alert.value))
      .replace('{operator}', copy.operators[alert.operator] ?? alert.operator)
      .replace('{threshold}', formatValue(alert.metric, alert.threshold)),
    to: technicianDetailPath(alert.technicianId),
  }))
}
