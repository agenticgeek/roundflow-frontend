import { api } from '@/api/client'

/** CONTRACT-DIFF: `/reports/*` not in generated OpenAPI yet — live per REPORTS_HANDOFF. */

export type ReportsPeriodParam = 'today' | 'last7' | 'last30'

export type ReportsVisitStatusParam = 'COMPLETED' | 'SKIPPED' | 'SCHEDULED'

export type ReportsSummary = {
  totalRevenue: number
  completedVisits: number
  completedRounds: number
  undonePayments: number
}

export type ReportsRevenuePoint = {
  date: string
  amount: number
}

export type ReportsTechnicianRow = {
  technicianId: string
  name: string
  email: string | null
  completed: number
  skipped: number
  efficiency: number
  revenueImpact: number
}

export type ReportsVisitRow = {
  visitId: string
  date: string
  property: string
  postcode: string | null
  round: string | null
  technician: string | null
  status: 'COMPLETED' | 'SKIPPED' | 'SCHEDULED' | 'IN_PROGRESS'
  amount: number | null
}

export type ReportsActivityRow = {
  id: string
  type: string
  message: string
  actorRole: string | null
  createdAt: string
}

export type ReportsSummaryParams = {
  period?: ReportsPeriodParam
}

export type ReportsRevenueParams = {
  period?: ReportsPeriodParam
  granularity?: 'daily'
}

export type ReportsTechniciansParams = {
  period?: ReportsPeriodParam
}

export type ReportsVisitsParams = {
  period?: ReportsPeriodParam
  status?: ReportsVisitStatusParam
}

export type ReportsActivityParams = {
  type?: string
}

function toQuery(params: Record<string, string | undefined>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value)
  }
  const qs = search.toString()
  return qs ? `?${qs}` : ''
}

export const reportsApi = {
  summary: (params: ReportsSummaryParams = {}, signal?: AbortSignal) =>
    api<ReportsSummary>(
      `/reports/summary${toQuery({ period: params.period })}`,
      { signal },
    ),

  revenue: (params: ReportsRevenueParams = {}, signal?: AbortSignal) =>
    api<ReportsRevenuePoint[]>(
      `/reports/revenue${toQuery({
        period: params.period,
        granularity: params.granularity ?? 'daily',
      })}`,
      { signal },
    ),

  technicians: (params: ReportsTechniciansParams = {}, signal?: AbortSignal) =>
    api<ReportsTechnicianRow[]>(
      `/reports/technicians${toQuery({ period: params.period })}`,
      { signal },
    ),

  visits: (params: ReportsVisitsParams = {}, signal?: AbortSignal) =>
    api<ReportsVisitRow[]>(
      `/reports/visits${toQuery({
        period: params.period,
        status: params.status,
      })}`,
      { signal },
    ),

  activity: (params: ReportsActivityParams = {}, signal?: AbortSignal) =>
    api<ReportsActivityRow[]>(
      `/reports/activity${toQuery({ type: params.type })}`,
      { signal },
    ),
}
