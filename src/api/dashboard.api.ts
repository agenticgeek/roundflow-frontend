import { api } from '@/api/client'

import type { components } from '@/api/types.gen'

type Schemas = components['schemas']

export type DashboardKpis = Schemas['DashboardKpis']
/** Counts plus `kpiAlerts` — KPI thresholds crossed this month (GAP-025). */
export type DashboardAlerts = Schemas['DashboardAlerts']
export type DashboardKpiAlert = Schemas['KpiThresholdAlert']
export type DashboardRoundStatus = Schemas['DashboardRoundRow']['status']
/** `scheduledValue` / `completedValue` replace the deprecated `value`; `etaMinutes` is always null. */
export type DashboardRoundRow = Schemas['DashboardRoundRow']
export type DashboardPeriod = 'monthly' | 'yearly'
/** `timeOnJobMinutes` / `revenuePerHour` are computed (null = no timed visit in the period). */
export type DashboardTechnicianKpi = Schemas['TechnicianKpi']
export type DashboardChartRange = '6m' | '12m'
/** `revenuePerHour` is one figure for the range (null without timed visits). */
export type DashboardCharts = Schemas['DashboardChartData']

export const dashboardApi = {
  kpis: (signal?: AbortSignal) => api<DashboardKpis>('/dashboard/kpis', { signal }),

  alerts: (signal?: AbortSignal) => api<DashboardAlerts>('/dashboard/alerts', { signal }),

  rounds: (signal?: AbortSignal) => api<DashboardRoundRow[]>('/dashboard/rounds', { signal }),

  technicianKpis: (period: DashboardPeriod, signal?: AbortSignal) =>
    api<DashboardTechnicianKpi[]>(`/dashboard/technician-kpis?period=${period}`, { signal }),

  /** `technicianIds` narrows the charts to those technicians; omit for everyone. */
  charts: (range: DashboardChartRange, technicianIds: readonly string[] = [], signal?: AbortSignal) => {
    const search = new URLSearchParams({ range })
    if (technicianIds.length > 0) search.set('technicianIds', technicianIds.join(','))
    return api<DashboardCharts>(`/dashboard/charts?${search.toString()}`, { signal })
  },
}
