import { api } from '@/api/client'

/** CONTRACT-DIFF: `/dashboard/*` not in generated OpenAPI yet — live per DASHBOARD handoff. */

export type DashboardKpis = {
  jobsScheduledToday: number
  openComplaints: number
  openComplaintsByPriority: { high: number; medium: number; low: number }
  cleanUnpaidAmount: number
  cleanUnpaidCount: number
  monthlyRevenue: number
}

export type DashboardAlerts = {
  skippedNeedingReview: number
  failedPayments: number
  complaintRevisitsDue: number
}

export type DashboardRoundStatus = 'not_started' | 'in_progress' | 'complete'

export type DashboardRoundRow = {
  roundId: string
  roundName: string
  technicianId: string | null
  technicianName: string | null
  status: DashboardRoundStatus
  total: number
  completed: number
  skipped: number
  issueCount: number
  paymentHolds: number
  value: number
  /** Always null — Phase 2 stub. */
  etaMinutes: number | null
}

export type DashboardPeriod = 'monthly' | 'yearly'

export type DashboardTechnicianKpi = {
  technicianId: string
  technicianName: string
  jobsCompleted: number
  valueCompleted: number
  openComplaints: number
  issueCount: number
  /** Phase 2 stubs — always null. */
  timeOnJobMinutes: number | null
  strikes: number | null
  damages: number | null
  upsells: number | null
}

export type DashboardChartRange = '6m' | '12m'

export type DashboardCharts = {
  months: string[]
  valueCompleted: number[]
  issueCount: number[]
  /** Always null — Phase 2 stub. */
  revenuePerHour: number[] | null
}

export const dashboardApi = {
  kpis: (signal?: AbortSignal) => api<DashboardKpis>('/dashboard/kpis', { signal }),

  alerts: (signal?: AbortSignal) => api<DashboardAlerts>('/dashboard/alerts', { signal }),

  rounds: (signal?: AbortSignal) => api<DashboardRoundRow[]>('/dashboard/rounds', { signal }),

  technicianKpis: (period: DashboardPeriod, signal?: AbortSignal) =>
    api<DashboardTechnicianKpi[]>(`/dashboard/technician-kpis?period=${period}`, { signal }),

  charts: (range: DashboardChartRange, signal?: AbortSignal) =>
    api<DashboardCharts>(`/dashboard/charts?range=${range}`, { signal }),
}
