import { useMemo } from 'react'
import { useRoundDetails, useRounds } from '@/features/rounds/hooks/useRounds'

export interface TechnicianRoundOption {
  id: string
  name: string
}

/**
 * The active rounds a technician works (CHAT-01): the round list narrowed to rounds that have
 * technicians, then each round's detail to find this one. Reuses the rounds queries the planner
 * already caches. Chat threads are per round, so these are the rounds an admin can message.
 */
export function useTechnicianRounds(technicianId: string) {
  const roundsQuery = useRounds('ACTIVE')
  const staffed = useMemo(
    () => (roundsQuery.data ?? []).filter((round) => round.technicianCount > 0),
    [roundsQuery.data],
  )
  const details = useRoundDetails(useMemo(() => staffed.map((round) => round.id), [staffed]))

  const rounds = useMemo<TechnicianRoundOption[]>(
    () =>
      staffed
        .filter((round) => details.byRoundId.get(round.id)?.technicians.some((technician) => technician.id === technicianId))
        .map((round) => ({ id: round.id, name: round.name })),
    [details.byRoundId, staffed, technicianId],
  )

  return {
    rounds,
    isPending: roundsQuery.isPending || (staffed.length > 0 && details.isLoading),
    isError: roundsQuery.isError || details.isError,
    error: roundsQuery.error ?? details.error,
  }
}
