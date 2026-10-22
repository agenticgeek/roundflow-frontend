import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { authApi } from '@/api/auth.api'
import type { UserPreferences, UserPreferencesResponse } from '@/api/auth.api'
import { queryKeys } from '@/lib/query-keys'

/** Per-user preferences bag (GET on load). `{}` when never set. */
export function usePreferences(enabled = true) {
  return useQuery({
    queryKey: queryKeys.auth.preferences,
    queryFn: ({ signal }) => authApi.getPreferences(signal),
    enabled,
    staleTime: 5 * 60 * 1000,
  })
}

/** Shallow-merges keys into the stored bag; primes the cache with the result. */
export function useUpdatePreferences() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (patch: UserPreferences) => authApi.updatePreferences(patch),
    onSuccess: (data: UserPreferencesResponse) => {
      queryClient.setQueryData(queryKeys.auth.preferences, data)
    },
  })
}
