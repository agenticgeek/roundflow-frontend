import { useQuery } from '@tanstack/react-query'
import { carryoverApi, type CarryoverInput } from '@/api/carryover.api'

/** GET /visits/carryover/options — the day(s) unfinished visits can move to. */
export function useCarryoverOptions(date: string, enabled: boolean) {
  return useQuery({
    queryKey: ['carryover', 'options', date],
    queryFn: ({ signal }) => carryoverApi.options(date, signal),
    enabled,
    staleTime: 60_000,
  })
}

/** POST /visits/carryover with `dryRun: true` — what would move and who has a conflict. Never cached. */
export function useCarryoverPreview(input: Omit<CarryoverInput, 'dryRun'> | null) {
  return useQuery({
    queryKey: ['carryover', 'preview', input],
    queryFn: ({ signal }) => carryoverApi.carryover({ ...(input as CarryoverInput), dryRun: true }, signal),
    enabled: input !== null,
    gcTime: 0,
    staleTime: 0,
    retry: false,
  })
}
