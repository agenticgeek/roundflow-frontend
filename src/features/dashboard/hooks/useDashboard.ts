import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import {
  dashboardApi,
  type DashboardChartRange,
  type DashboardPeriod,
} from '@/api/dashboard.api'
import { invalidateDashboard, queryKeys } from '@/lib/query-keys'
import { useAppBootstrap } from '@/providers/AppBootstrapProvider'

/** Live tiles refresh on their own — the header advertises "auto-refresh". */
const LIVE_REFETCH_MS = 60_000

function useDashboardEnabled(enabled = true) {
  const { canMutate } = useAppBootstrap()
  // Dashboard endpoints are ADMIN/MANAGER only — TECHNICIAN gets 403 (handoff §4).
  return enabled && canMutate
}

export function useDashboardKpis(enabled = true) {
  return useQuery({
    queryKey: queryKeys.dashboard.kpis,
    queryFn: ({ signal }) => dashboardApi.kpis(signal),
    enabled: useDashboardEnabled(enabled),
    refetchInterval: LIVE_REFETCH_MS,
  })
}

export function useDashboardAlerts(enabled = true) {
  return useQuery({
    queryKey: queryKeys.dashboard.alerts,
    queryFn: ({ signal }) => dashboardApi.alerts(signal),
    enabled: useDashboardEnabled(enabled),
    refetchInterval: LIVE_REFETCH_MS,
  })
}

export function useDashboardRounds(enabled = true) {
  return useQuery({
    queryKey: queryKeys.dashboard.rounds,
    queryFn: ({ signal }) => dashboardApi.rounds(signal),
    enabled: useDashboardEnabled(enabled),
    refetchInterval: LIVE_REFETCH_MS,
  })
}

export function useDashboardTechnicianKpis(period: DashboardPeriod, enabled = true) {
  return useQuery({
    queryKey: queryKeys.dashboard.technicianKpis(period),
    queryFn: ({ signal }) => dashboardApi.technicianKpis(period, signal),
    enabled: useDashboardEnabled(enabled),
  })
}

/** Charts for the selected technicians (all of them when none are selected). */
export function useDashboardCharts(
  range: DashboardChartRange,
  technicianIds: readonly string[] = [],
  enabled = true,
) {
  return useQuery({
    queryKey: queryKeys.dashboard.charts(range, technicianIds),
    queryFn: ({ signal }) => dashboardApi.charts(range, technicianIds, signal),
    enabled: useDashboardEnabled(enabled),
    placeholderData: keepPreviousData,
  })
}

/** Refetch every dashboard query — wired to the header refresh button. */
export function useRefreshDashboard() {
  const queryClient = useQueryClient()
  return () => invalidateDashboard(queryClient)
}
