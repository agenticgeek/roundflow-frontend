import { Link } from 'react-router-dom'
import { DashboardIcon } from '@/components/dashboard/DashboardIcon'
import { dashboardContent } from '@/content/dashboard'
import type { KpiAlertRow } from '@/features/dashboard/lib/kpi-alerts'

/** KPI threshold alerts raised by the nightly check (GAP-025); hidden when there are none. */
export function KpiAlertsPanel({ rows }: { rows: readonly KpiAlertRow[] }) {
  const copy = dashboardContent.kpiAlerts
  if (rows.length === 0) return null
  return (
    <section className="rounded-xl border border-warning-border bg-warning-surface p-4 shadow-sm sm:p-5">
      <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
        <DashboardIcon name="alert-circle" className="h-4 w-4 text-warning" />
        {copy.title}
      </h2>
      <ul className="mt-3 divide-y divide-warning-border">
        {rows.map((row) => (
          <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
            <span>
              <span className="font-semibold text-foreground">{row.technicianName}</span>
              <span className="text-warning-foreground"> · {row.line}</span>
            </span>
            <Link to={row.to} className="font-semibold text-primary underline underline-offset-2">
              {copy.open}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
