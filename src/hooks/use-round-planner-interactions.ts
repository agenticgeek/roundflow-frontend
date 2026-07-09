import { useCallback, useMemo, useState } from 'react'
import type { RoundPlannerListItem, RoundPlannerRound, RoundPlannerView } from '@/content/round-planner'
import { roundPlannerContent } from '@/content/round-planner'

export interface SelectedRoundDetail {
  round: RoundPlannerRound
  dateLabel: string
}

/** Round Planner UI state — week, filters, view mode, search. */
export function useRoundPlannerInteractions() {
  const { defaults, days } = roundPlannerContent

  const [weekId, setWeekId] = useState<string>(defaults.weekId)
  const [areaId, setAreaId] = useState<string>(defaults.areaId)
  const [technicianId, setTechnicianId] = useState<string>(defaults.technicianId)
  const [statusId, setStatusId] = useState<string>(defaults.statusId)
  const [view, setView] = useState<RoundPlannerView>(defaults.view)
  const [search, setSearch] = useState<string>(defaults.search)
  const [syncing, setSyncing] = useState(false)
  const [selectedRoundId, setSelectedRoundId] = useState<string | null>(null)
  const [expandedListItemId, setExpandedListItemId] = useState<string | null>(null)
  const [removePropertyItemId, setRemovePropertyItemId] = useState<string | null>(null)

  const syncCycle = useCallback(() => {
    setSyncing(true)
    window.setTimeout(() => setSyncing(false), 600)
  }, [])

  const filteredDays = useMemo(() => {
    const weekFiltered =
      weekId === 'all' ? days : days.filter((day) => day.weekId === weekId)

    const query = search.trim().toLowerCase()

    return weekFiltered
      .map((day) => {
        const rounds = day.rounds.filter((round) => {
          if (technicianId !== 'all' && round.technician.toLowerCase() !== technicianId) {
            return false
          }
          if (statusId !== 'all' && round.status !== statusId) {
            return false
          }
          if (!query) return true

          const haystack = [
            round.title,
            round.technician,
            round.statusLabel,
            day.dateLabel,
            day.dayOfWeek,
          ]
            .join(' ')
            .toLowerCase()

          return haystack.includes(query)
        })

        return { ...day, rounds }
      })
      .filter((day) => {
        if (!query) return true
        return day.rounds.length > 0 || day.dateLabel.toLowerCase().includes(query)
      })
  }, [days, search, statusId, technicianId, weekId])

  const visibleWeeks = useMemo(() => {
    if (weekId === 'all') {
      return roundPlannerContent.weeks
    }

    return roundPlannerContent.weeks.filter((week) => week.id === weekId)
  }, [weekId])

  const selectedRound = useMemo<SelectedRoundDetail | null>(() => {
    if (!selectedRoundId) return null

    for (const day of days) {
      const round = day.rounds.find((item) => item.id === selectedRoundId)
      if (round) {
        return { round, dateLabel: day.dateLabel }
      }
    }

    return null
  }, [days, selectedRoundId])

  const openRoundDetail = useCallback((roundId: string) => {
    setSelectedRoundId(roundId)
  }, [])

  const closeRoundDetail = useCallback(() => {
    setSelectedRoundId(null)
  }, [])

  const filteredListItems = useMemo(() => {
    const { items } = roundPlannerContent.listView
    const query = search.trim().toLowerCase()

    return items.filter((item) => {
      if (technicianId !== 'all' && item.technician.toLowerCase() !== technicianId) {
        return false
      }

      if (statusId !== 'all') {
        const statusMatches =
          (statusId === 'completed' && item.status === 'completed') ||
          (statusId === 'scheduled' && item.status === 'scheduled') ||
          (statusId === 'in-progress' && item.status === 'hold')

        if (!statusMatches) return false
      }

      if (!query) return true

      const haystack = [item.address, item.customer, item.round, item.technician]
        .join(' ')
        .toLowerCase()

      return haystack.includes(query)
    })
  }, [search, statusId, technicianId])

  const toggleListItem = useCallback((itemId: string) => {
    setExpandedListItemId((current) => (current === itemId ? null : itemId))
  }, [])

  const removePropertyItem = useMemo<RoundPlannerListItem | null>(() => {
    if (!removePropertyItemId) return null

    return (
      roundPlannerContent.listView.items.find((item) => item.id === removePropertyItemId) ?? null
    )
  }, [removePropertyItemId])

  const openRemoveProperty = useCallback((itemId: string) => {
    setRemovePropertyItemId(itemId)
  }, [])

  const closeRemoveProperty = useCallback(() => {
    setRemovePropertyItemId(null)
  }, [])

  return {
    weekId,
    setWeekId,
    areaId,
    setAreaId,
    technicianId,
    setTechnicianId,
    statusId,
    setStatusId,
    view,
    setView,
    search,
    setSearch,
    syncing,
    syncCycle,
    filteredDays,
    visibleWeeks,
    selectedRound,
    openRoundDetail,
    closeRoundDetail,
    filteredListItems,
    expandedListItemId,
    toggleListItem,
    removePropertyItem,
    openRemoveProperty,
    closeRemoveProperty,
  }
}

export type RoundPlannerInteractions = ReturnType<typeof useRoundPlannerInteractions>
