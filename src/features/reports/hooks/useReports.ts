import { useQuery } from '@tanstack/react-query'
import {
  reportsApi,
  type ReportsActivityParams,
  type ReportsPeriodParam,
  type ReportsRevenueParams,
  type ReportsSummaryParams,
  type ReportsTechniciansParams,
  type ReportsVisitsParams,
} from '@/api/reports.api'
import { queryKeys } from '@/lib/query-keys'
import { useAppBootstrap } from '@/providers/AppBootstrapProvider'

function useReportsEnabled(enabled = true) {
  const { canMutate } = useAppBootstrap()
  // Reports require ADMIN/MANAGER per handoff.
  return enabled && canMutate
}

export function useReportsSummary(params: ReportsSummaryParams = {}, enabled = true) {
  const period = params.period ?? 'last30'
  return useQuery({
    queryKey: queryKeys.reports.summary(period),
    queryFn: ({ signal }) => reportsApi.summary({ period }, signal),
    enabled: useReportsEnabled(enabled),
  })
}

export function useReportsRevenue(params: ReportsRevenueParams = {}, enabled = true) {
  const period = params.period ?? 'last30'
  const granularity = params.granularity ?? 'daily'
  return useQuery({
    queryKey: queryKeys.reports.revenue(period, granularity),
    queryFn: ({ signal }) => reportsApi.revenue({ period, granularity }, signal),
    enabled: useReportsEnabled(enabled),
  })
}

export function useReportsTechnicians(
  params: ReportsTechniciansParams = {},
  enabled = true,
) {
  const period = params.period ?? 'last30'
  return useQuery({
    queryKey: queryKeys.reports.technicians(period),
    queryFn: ({ signal }) => reportsApi.technicians({ period }, signal),
    enabled: useReportsEnabled(enabled),
  })
}

export function useReportsVisits(params: ReportsVisitsParams = {}, enabled = true) {
  const period = params.period ?? 'last30'
  const status = params.status
  return useQuery({
    queryKey: queryKeys.reports.visits(period, status),
    queryFn: ({ signal }) => reportsApi.visits({ period, status }, signal),
    enabled: useReportsEnabled(enabled),
  })
}

export function useReportsActivity(params: ReportsActivityParams = {}, enabled = true) {
  const type = params.type
  return useQuery({
    queryKey: queryKeys.reports.activity(type),
    queryFn: ({ signal }) => reportsApi.activity({ type }, signal),
    enabled: useReportsEnabled(enabled),
  })
}

export type { ReportsPeriodParam }
