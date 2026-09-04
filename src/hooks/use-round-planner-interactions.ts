import { useCallback, useState } from 'react'
import type { RoundPlannerView } from '@/content/round-planner'
import { roundPlannerContent } from '@/content/round-planner'
import type { PlannerPeriod, PlannerStatusFilter } from '@/features/rounds/lib/planner'
import { todayIsoDate } from '@/features/rounds/lib/planner'

export interface SelectedPlannerCard {
  roundId: string
  date: string
}

/** Round Planner UI state — round, period/anchor, filters, view mode, selection. Data lives in the screen. */
export function useRoundPlannerInteractions() {
  const { defaults } = roundPlannerContent

  const [roundId, setRoundId] = useState<string>(defaults.roundId)
  const [period, setPeriod] = useState<PlannerPeriod>(defaults.period)
  const [anchorDate, setAnchorDate] = useState<string>(() => todayIsoDate())
  const [technicianId, setTechnicianId] = useState<string>(defaults.technicianId)
  const [statusId, setStatusId] = useState<PlannerStatusFilter>(defaults.statusId)
  const [view, setView] = useState<RoundPlannerView>(defaults.view)
  const [search, setSearch] = useState<string>(defaults.search)
  const [selectedDate, setSelectedDate] = useState<string>(() => todayIsoDate())
  const [selectedCard, setSelectedCard] = useState<SelectedPlannerCard | null>(null)
  const [expandedStopId, setExpandedStopId] = useState<string | null>(null)

  const openRoundDetail = useCallback((card: SelectedPlannerCard) => {
    setSelectedCard(card)
  }, [])

  const closeRoundDetail = useCallback(() => {
    setSelectedCard(null)
  }, [])

  const toggleStop = useCallback((visitId: string) => {
    setExpandedStopId((current) => (current === visitId ? null : visitId))
  }, [])

  /** Jump from a calendar card into List/Map for that round and date. */
  const openDayIn = useCallback((nextView: Exclude<RoundPlannerView, 'calendar'>, card: SelectedPlannerCard) => {
    setRoundId(card.roundId)
    setSelectedDate(card.date)
    setAnchorDate(card.date)
    setView(nextView)
    setSelectedCard(null)
  }, [])

  const goToToday = useCallback(() => {
    const today = todayIsoDate()
    setAnchorDate(today)
    setSelectedDate(today)
  }, [])

  return {
    roundId,
    setRoundId,
    period,
    setPeriod,
    anchorDate,
    setAnchorDate,
    technicianId,
    setTechnicianId,
    statusId,
    setStatusId,
    view,
    setView,
    search,
    setSearch,
    selectedDate,
    setSelectedDate,
    selectedCard,
    openRoundDetail,
    closeRoundDetail,
    openDayIn,
    expandedStopId,
    toggleStop,
    goToToday,
  }
}

export type RoundPlannerInteractions = ReturnType<typeof useRoundPlannerInteractions>
