import { useQuery } from '@tanstack/react-query'
import { authApi } from '@/api/auth.api'
import { queryKeys } from '@/lib/query-keys'

export function useMe(enabled = true) {
  return useQuery({
    queryKey: queryKeys.auth.me,
    queryFn: ({ signal }) => authApi.getMe(signal),
    enabled,
  })
}
