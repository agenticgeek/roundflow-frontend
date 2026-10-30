import { api, apiBlob } from '@/api/client'
import { toPaginated, type PageParams, type Paginated } from '@/api/pagination'
import type { VisitStatus } from '@/lib/visit-status'

/** CONTRACT-DIFF: `/reports/*` not in generated OpenAPI yet — live per REPORTS_HANDOFF. */

export type ReportsPeriodParam = 'today' | 'last7' | 'last30'

export type ReportsVisitStatusParam = 'COMPLETED' | 'SKIPPED' | 'SCHEDULED' | 'CANCELLED'

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
  status: VisitStatus
  amount: number | null
}

export type ReportsActivityRow = {
  id: string
  type: string
  message: string
  actorRole: string | null
  /** Resolved server-side from the actor's profile. */
  actorName?: string | null
  createdAt: string
}

export type ReportsSummaryParams = {
  period?: ReportsPeriodParam
}

export type ReportsRevenueParams = {
  period?: ReportsPeriodParam
  granularity?: 'daily'
}

export type ReportsTechniciansParams = PageParams & {
  period?: ReportsPeriodParam
}

export type ReportsVisitsParams = PageParams & {
  period?: ReportsPeriodParam
  status?: ReportsVisitStatusParam
}

export type ReportsActivityParams = {
  type?: string
}

export type ReportsExportType = 'visits' | 'technicians' | 'revenue'

export type ReportsExportParams = {
  /** Defaults to `visits` server-side. */
  type?: ReportsExportType
  period?: ReportsPeriodParam
  /** Only applies to `type: 'visits'`. */
  status?: ReportsVisitStatusParam
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

  /** Paginated `{ rows, pagination }` (audit follow-up 2026-10-22). */
  technicians: async (
    params: ReportsTechniciansParams = {},
    signal?: AbortSignal,
  ): Promise<Paginated<ReportsTechnicianRow>> =>
    toPaginated(
      await api<Paginated<ReportsTechnicianRow> | ReportsTechnicianRow[]>(
        `/reports/technicians${toQuery({
          period: params.period,
          page: params.page ? String(params.page) : undefined,
          pageSize: params.pageSize ? String(params.pageSize) : undefined,
        })}`,
        { signal },
      ),
    ),

  /** Paginated `{ rows, pagination }` (audit follow-up 2026-10-22). */
  visits: async (
    params: ReportsVisitsParams = {},
    signal?: AbortSignal,
  ): Promise<Paginated<ReportsVisitRow>> =>
    toPaginated(
      await api<Paginated<ReportsVisitRow> | ReportsVisitRow[]>(
        `/reports/visits${toQuery({
          period: params.period,
          status: params.status,
          page: params.page ? String(params.page) : undefined,
          pageSize: params.pageSize ? String(params.pageSize) : undefined,
        })}`,
        { signal },
      ),
    ),

  /** Paginated `{ rows, pagination }` like visits/technicians (GAP-024: it was read as an array). */
  activity: async (
    params: ReportsActivityParams = {},
    signal?: AbortSignal,
  ): Promise<Paginated<ReportsActivityRow>> =>
    toPaginated(
      await api<Paginated<ReportsActivityRow> | ReportsActivityRow[]>(
        `/reports/activity${toQuery({ type: params.type })}`,
        { signal },
      ),
    ),

  /** Streams a CSV download — unpaginated on purpose. `type` defaults to `visits` server-side. */
  exportCsv: (params: ReportsExportParams = {}, signal?: AbortSignal) =>
    apiBlob(
      `/reports/export${toQuery({
        type: params.type,
        period: params.period,
        status: params.status,
      })}`,
      { signal, headers: { Accept: 'text/csv' } },
    ),
}
