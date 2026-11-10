import { useQuery } from '@tanstack/react-query'
import { floApi } from '@/api/flo.api'

export const floKeys = {
  all: ['flo'] as const,
  status: ['flo', 'status'] as const,
  suggestions: ['flo', 'suggestions'] as const,
  conversations: ['flo', 'conversations'] as const,
}

/** GET /flo/status: is Flo switched on, the answer styles and how many questions are left today. */
export function useFloStatus(enabled = true) {
  return useQuery({ queryKey: floKeys.status, queryFn: ({ signal }) => floApi.status(signal), enabled, retry: false })
}

/** GET /flo/suggestions: the suggested questions, grouped by area (server-owned, no deploy to change). */
export function useFloSuggestions(enabled = true) {
  return useQuery({
    queryKey: floKeys.suggestions,
    queryFn: ({ signal }) => floApi.suggestions(signal),
    enabled,
    retry: false,
    staleTime: 5 * 60_000,
  })
}
