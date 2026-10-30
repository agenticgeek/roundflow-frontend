import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { settingsApi, type KpiThresholdInput } from '@/api/settings.api'
import { queryKeys } from '@/lib/query-keys'

export const KPI_THRESHOLDS_KEY = [...queryKeys.settings.all, 'kpi-thresholds'] as const

/** GAP-025: GET /settings/kpi-thresholds (not gated on setup). */
export function useKpiThresholds() {
  return useQuery({
    queryKey: KPI_THRESHOLDS_KEY,
    queryFn: ({ signal }) => settingsApi.getKpiThresholds(signal),
  })
}

/** PUT replaces the whole list; the response is the saved list, so it goes straight into the cache. */
export function useSaveKpiThresholds() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (thresholds: KpiThresholdInput[]) => settingsApi.saveKpiThresholds(thresholds),
    // A duplicate metric + operator (400) is shown inline by the panel.
    meta: { silenceGlobalError: true },
    onSuccess: (saved) => queryClient.setQueryData(KPI_THRESHOLDS_KEY, saved),
  })
}
