import { useCallback, useMemo, useState } from 'react'
import type { TodaysWorkRound } from '@/content/todays-work'
import { todaysWorkContent } from '@/content/todays-work'

function roundHasProblems(round: (typeof todaysWorkContent.rounds)[number]) {
  return round.skipped > 0 || round.issues > 0 || round.paymentHolds > 0
}

/** Today's Work UI state — search, problem filter, live refresh. */
export function useTodaysWorkInteractions() {
  const { defaults, header, rounds } = todaysWorkContent

  const [search, setSearch] = useState<string>(defaults.search)
  const [showOnlyProblems, setShowOnlyProblems] = useState<boolean>(defaults.showOnlyProblems)
  const [lastUpdated, setLastUpdated] = useState<string>(header.lastUpdated)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedRoundId, setSelectedRoundId] = useState<string | null>(null)
  const [reassignRoundId, setReassignRoundId] = useState<string | null>(null)
  const [pushMissedJobsRoundId, setPushMissedJobsRoundId] = useState<string | null>(null)
  const [closeDayOpen, setCloseDayOpen] = useState(false)

  const refresh = useCallback(() => {
    setRefreshing(true)
    window.setTimeout(() => {
      const now = new Date()
      const formatted = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      setLastUpdated(`Updated ${formatted}`)
      setRefreshing(false)
    }, 600)
  }, [])

  const toggleShowOnlyProblems = useCallback(() => {
    setShowOnlyProblems((current) => !current)
  }, [])

  const filteredRounds = useMemo(() => {
    const query = search.trim().toLowerCase()

    return rounds.filter((round) => {
      if (showOnlyProblems && !roundHasProblems(round)) {
        return false
      }

      if (!query) return true

      const haystack = [round.round, round.technician, round.eta, round.value]
        .join(' ')
        .toLowerCase()

      return haystack.includes(query)
    })
  }, [rounds, search, showOnlyProblems])

  const selectedRound = useMemo<TodaysWorkRound | null>(() => {
    if (!selectedRoundId) return null
    return rounds.find((round) => round.id === selectedRoundId) ?? null
  }, [rounds, selectedRoundId])

  const openRoundDetail = useCallback((roundId: string) => {
    setSelectedRoundId(roundId)
  }, [])

  const closeRoundDetail = useCallback(() => {
    setSelectedRoundId(null)
  }, [])

  const reassignRound = useMemo<TodaysWorkRound | null>(() => {
    if (!reassignRoundId) return null
    return rounds.find((round) => round.id === reassignRoundId) ?? null
  }, [reassignRoundId, rounds])

  const openReassignTechnician = useCallback((roundId: string) => {
    setReassignRoundId(roundId)
  }, [])

  const closeReassignTechnician = useCallback(() => {
    setReassignRoundId(null)
  }, [])

  const pushMissedJobsRound = useMemo<TodaysWorkRound | null>(() => {
    if (!pushMissedJobsRoundId) return null
    return rounds.find((round) => round.id === pushMissedJobsRoundId) ?? null
  }, [pushMissedJobsRoundId, rounds])

  const openPushMissedJobs = useCallback((roundId: string) => {
    setPushMissedJobsRoundId(roundId)
  }, [])

  const closePushMissedJobs = useCallback(() => {
    setPushMissedJobsRoundId(null)
  }, [])

  const openCloseDay = useCallback(() => {
    setCloseDayOpen(true)
  }, [])

  const closeCloseDay = useCallback(() => {
    setCloseDayOpen(false)
  }, [])

  return {
    search,
    setSearch,
    showOnlyProblems,
    toggleShowOnlyProblems,
    lastUpdated,
    refreshing,
    refresh,
    filteredRounds,
    selectedRound,
    openRoundDetail,
    closeRoundDetail,
    reassignRound,
    openReassignTechnician,
    closeReassignTechnician,
    pushMissedJobsRound,
    openPushMissedJobs,
    closePushMissedJobs,
    closeDayOpen,
    openCloseDay,
    closeCloseDay,
  }
}

export type TodaysWorkInteractions = ReturnType<typeof useTodaysWorkInteractions>
