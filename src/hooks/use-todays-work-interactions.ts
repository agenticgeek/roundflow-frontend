import { useCallback, useMemo, useState } from 'react'
import type { TodaysWorkRound } from '@/content/todays-work'
import { todaysWorkContent } from '@/content/todays-work'
import { useToday } from '@/features/today/hooks/useToday'
import {
  formatTodayDateLabel,
  todayKpiToMetrics,
  todayRoundToUi,
  todayTechniciansToWorkload,
} from '@/features/today/lib/mappers'

function roundHasProblems(round: TodaysWorkRound) {
  return round.skipped > 0 || round.issues > 0 || round.paymentHolds > 0
}

/** Today's Work UI state — search, problem filter, live refresh over API data. */
export function useTodaysWorkInteractions() {
  const { defaults, header } = todaysWorkContent
  const todayQuery = useToday()

  const [search, setSearch] = useState<string>(defaults.search)
  const [showOnlyProblems, setShowOnlyProblems] = useState<boolean>(defaults.showOnlyProblems)
  const [lastUpdated, setLastUpdated] = useState<string>(header.lastUpdated)
  const [selectedRoundId, setSelectedRoundId] = useState<string | null>(null)
  const [reassignRoundId, setReassignRoundId] = useState<string | null>(null)
  const [pushMissedJobsRoundId, setPushMissedJobsRoundId] = useState<string | null>(null)
  const [closeDayOpen, setCloseDayOpen] = useState(false)

  const rounds = useMemo(
    () => (todayQuery.data?.rounds ?? []).map(todayRoundToUi),
    [todayQuery.data?.rounds],
  )

  const metrics = useMemo(() => todayKpiToMetrics(todayQuery.data), [todayQuery.data])
  const technicians = useMemo(
    () => todayTechniciansToWorkload(todayQuery.data?.technicians),
    [todayQuery.data?.technicians],
  )
  const dateLabel = formatTodayDateLabel(todayQuery.data?.date)
  const dayClosed = todayQuery.data?.dayClosed === true
  const hasNoVisitsToday = todayQuery.isSuccess && (todayQuery.data?.rounds.length ?? 0) === 0

  const refresh = useCallback(() => {
    void todayQuery.refetch().then(() => {
      const now = new Date()
      const formatted = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      setLastUpdated(`Updated ${formatted}`)
    })
  }, [todayQuery])

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
    refreshing: todayQuery.isFetching,
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
    metrics,
    technicians,
    dateLabel,
    dayClosed,
    hasNoVisitsToday,
    todayQuery,
  }
}

export type TodaysWorkInteractions = ReturnType<typeof useTodaysWorkInteractions>
