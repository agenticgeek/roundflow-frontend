import { useQuery } from '@tanstack/react-query'
import { roundsApi, type SetRoundTechniciansInput } from '@/api/rounds.api'
import { queryKeys } from '@/lib/query-keys'

/** GET /rounds/:id/allocation — the saved split, used to prefill the wizard (GAP-012). */
export function useRoundAllocation(roundId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.rounds.allocation(roundId),
    queryFn: ({ signal }) => roundsApi.getAllocation(roundId, signal),
    enabled: enabled && Boolean(roundId),
  })
}

/** The round's properties for the MANUAL split table. */
export function useRoundProperties(roundId: string, enabled = true) {
  return useQuery({
    queryKey: [...queryKeys.rounds.detail(roundId), 'properties'] as const,
    queryFn: ({ signal }) => roundsApi.listProperties(roundId, signal),
    enabled: enabled && Boolean(roundId),
  })
}

/**
 * `PUT /rounds/:id/technicians?dryRun=true` — what a split would do, without saving: per
 * technician stops and value (AUTO preview, Review). Nothing is written, so it's a query.
 */
export function useAllocationPreview(roundId: string, input: SetRoundTechniciansInput, enabled = true) {
  return useQuery({
    queryKey: [...queryKeys.rounds.allocation(roundId), 'preview', JSON.stringify(input)] as const,
    queryFn: ({ signal }) => roundsApi.setTechnicians(roundId, input, { dryRun: true, signal }),
    enabled: enabled && Boolean(roundId) && input.technicianIds.length > 0,
    retry: false,
  })
}
