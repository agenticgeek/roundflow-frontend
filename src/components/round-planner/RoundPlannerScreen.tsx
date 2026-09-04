import { useEffect, useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { RoundPlannerMetric } from '@/content/round-planner'
import { roundPlannerContent } from '@/content/round-planner'
import type { RoundPlannerInteractions } from '@/hooks/use-round-planner-interactions'
import type { PlannerListStop, PlannerRoundCard } from '@/features/rounds/lib/planner'
import {
  addDays,
  buildPlannerWindow,
  buildRoundCards,
  formatMinutes,
  formatWindowLabel,
  isBetween,
  sumKpis,
  technicianLabel,
  todayIsoDate,
  visitStatusMatchesFilter,
  windowStepDays,
} from '@/features/rounds/lib/planner'
import {
  useRoundDetails,
  useRounds,
  useRoundsOccurrenceDay,
  useRoundsOccurrences,
} from '@/features/rounds/hooks/useRounds'
import { useRoundSettings } from '@/features/settings/hooks/useSettings'
import { useTechniciansList } from '@/features/technicians/hooks/useTechnicians'
import { useAppBootstrap } from '@/providers/AppBootstrapProvider'
import { RoundPlannerCalendar } from '@/components/round-planner/RoundPlannerCalendar'
import { RoundPlannerDetailPanel } from '@/components/round-planner/RoundPlannerDetailPanel'
import { RoundPlannerHeader } from '@/components/round-planner/RoundPlannerHeader'
import { RoundPlannerListView } from '@/components/round-planner/RoundPlannerListView'
import { RoundPlannerMapView } from '@/components/round-planner/RoundPlannerMapView'
import { RoundPlannerMetrics } from '@/components/round-planner/RoundPlannerMetrics'
import { RoundPlannerToolbar } from '@/components/round-planner/RoundPlannerToolbar'
import { PanelCard } from '@/components/dashboard/DashboardControls'
import { dashboardCtaClass } from '@/components/dashboard/dashboard-styles'
import { queryKeys } from '@/lib/query-keys'
import { errorMessage } from '@/lib/errors'
import { cn, formatCurrency } from '@/lib/utils'

interface RoundPlannerScreenProps {
  interactions: RoundPlannerInteractions
  onAddRound?: () => void
  onBulkMessage?: () => void
  onAddOneOffJob?: () => void
  onViewPropertyDetails?: (propertyId: string) => void
}

/** Composes Round Planner sections — data from the planner endpoints, state from the interactions hook. */
export function RoundPlannerScreen({
  interactions,
  onAddRound,
  onBulkMessage,
  onAddOneOffJob,
  onViewPropertyDetails,
}: RoundPlannerScreenProps) {
  const content = roundPlannerContent
  const { canMutate } = useAppBootstrap()
  const queryClient = useQueryClient()
  const today = todayIsoDate()

  const roundsQuery = useRounds()
  const settingsQuery = useRoundSettings()
  const techniciansQuery = useTechniciansList()

  const rounds = useMemo(
    () => (roundsQuery.data ?? []).filter((round) => round.status !== 'ARCHIVED'),
    [roundsQuery.data],
  )
  const selectedRounds = useMemo(
    () =>
      interactions.roundId === 'all'
        ? rounds
        : rounds.filter((round) => round.id === interactions.roundId),
    [interactions.roundId, rounds],
  )
  const roundIds = useMemo(() => selectedRounds.map((round) => round.id), [selectedRounds])

  const currency = settingsQuery.data?.currency ?? 'GBP'
  const window = useMemo(
    () =>
      buildPlannerWindow(
        interactions.period,
        interactions.anchorDate,
        settingsQuery.data?.defaultCycleLength,
      ),
    [interactions.anchorDate, interactions.period, settingsQuery.data?.defaultCycleLength],
  )

  // Keep the List/Map date inside the visible window.
  const { selectedDate, setSelectedDate } = interactions
  useEffect(() => {
    if (isBetween(selectedDate, window.from, window.to)) return
    setSelectedDate(isBetween(today, window.from, window.to) ? today : window.from)
  }, [selectedDate, setSelectedDate, today, window.from, window.to])

  // If the selected round disappears (archived / deleted), fall back to all rounds.
  const { roundId, setRoundId } = interactions
  useEffect(() => {
    if (roundId === 'all' || !roundsQuery.data) return
    if (!rounds.some((round) => round.id === roundId)) setRoundId('all')
  }, [roundId, rounds, roundsQuery.data, setRoundId])

  const occurrences = useRoundsOccurrences(roundIds, { from: window.from, to: window.to })
  const details = useRoundDetails(roundIds)

  const cards = useMemo<PlannerRoundCard[]>(
    () =>
      selectedRounds.flatMap((round) =>
        buildRoundCards(
          round,
          occurrences.byRoundId.get(round.id) ?? [],
          technicianLabel(details.byRoundId.get(round.id)?.technicians),
        ),
      ),
    [details.byRoundId, occurrences.byRoundId, selectedRounds],
  )

  const query = interactions.search.trim().toLowerCase()

  const cardsByDate = useMemo(() => {
    const map = new Map<string, PlannerRoundCard[]>()
    for (const card of cards) {
      if (interactions.statusId !== 'all' && card.status !== interactions.statusId) continue
      if (query && !card.roundName.toLowerCase().includes(query)) continue
      const bucket = map.get(card.date)
      if (bucket) bucket.push(card)
      else map.set(card.date, [card])
    }
    for (const bucket of map.values()) bucket.sort((a, b) => a.roundName.localeCompare(b.roundName))
    return map
  }, [cards, interactions.statusId, query])

  const kpis = useMemo(() => sumKpis(cards), [cards])
  const metrics: RoundPlannerMetric[] = [
    { label: content.kpis.totalStops, value: String(kpis.stopCount) },
    { label: content.kpis.roundValue, value: formatCurrency(kpis.totalValue, currency) },
    {
      label: content.kpis.estimatedDuration,
      value: formatMinutes(kpis.estimatedMinutes),
      hint: content.kpis.estimatedHint,
    },
    { label: content.kpis.completion, value: `${kpis.completionPct}%` },
    { label: content.kpis.paymentHolds, value: String(kpis.holdCount), tone: 'warning' },
    { label: content.kpis.issues, value: String(kpis.issueCount), tone: 'danger' },
  ]

  // Day view — List and Map.
  const dayEnabled = interactions.view !== 'calendar'
  const day = useRoundsOccurrenceDay(roundIds, interactions.selectedDate, dayEnabled)

  const dayStops = useMemo<PlannerListStop[]>(
    () =>
      selectedRounds.flatMap((round) => {
        const result = day.byRoundId.get(round.id)
        if (!result) return []
        return result.stops.map((stop) => ({ ...stop, roundId: round.id, roundName: result.roundName || round.name }))
      }),
    [day.byRoundId, selectedRounds],
  )

  const filteredStops = useMemo(
    () =>
      dayStops.filter((stop) => {
        if (interactions.technicianId !== 'all' && stop.technicianId !== interactions.technicianId) return false
        if (!visitStatusMatchesFilter(stop.status, interactions.statusId)) return false
        if (!query) return true
        return [stop.addressLine, stop.postcode, stop.customerName, stop.propertyName ?? '', stop.roundName]
          .join(' ')
          .toLowerCase()
          .includes(query)
      }),
    [dayStops, interactions.statusId, interactions.technicianId, query],
  )

  const roundOptions = useMemo(
    () => [
      { value: 'all', label: content.filters.round.allLabel },
      ...rounds.map((round) => ({ value: round.id, label: round.name })),
    ],
    [content.filters.round.allLabel, rounds],
  )

  const technicianOptions = useMemo(
    () => [
      { value: 'all', label: content.filters.technician.allLabel },
      ...(techniciansQuery.data ?? []).map((technician) => ({
        value: technician.id,
        label: technician.name ?? 'Unnamed technician',
      })),
    ],
    [content.filters.technician.allLabel, techniciansQuery.data],
  )

  const windowLabel = `${interactions.period === 'cycle' ? content.header.cyclePrefix : content.header.weekPrefix} ${formatWindowLabel(window)}`
  const stepDays = windowStepDays(window)
  const refreshing = roundsQuery.isFetching || occurrences.isFetching || day.isFetching

  function refresh() {
    void roundsQuery.refetch()
    void queryClient.invalidateQueries({ queryKey: queryKeys.rounds.all })
  }

  const plannerError = roundsQuery.isError
    ? roundsQuery.error
    : occurrences.isError
      ? occurrences.error
      : dayEnabled && day.isError
        ? day.error
        : null

  const noRounds = roundsQuery.isSuccess && rounds.length === 0
  const noVisitsInWindow =
    !noRounds && !occurrences.isLoading && !occurrences.isError && roundIds.length > 0 && cards.length === 0

  return (
    <div className="space-y-4">
      <RoundPlannerHeader
        title={content.header.title}
        subtitle={content.header.subtitle}
        windowLabel={windowLabel}
        syncLabel={content.header.syncLabel}
        syncing={refreshing}
        onSync={refresh}
        previousLabel={content.header.previousPeriod}
        nextLabel={content.header.nextPeriod}
        todayLabel={content.header.today}
        onPrevious={() => interactions.setAnchorDate(addDays(window.from, -stepDays))}
        onNext={() => interactions.setAnchorDate(addDays(window.from, stepDays))}
        onToday={interactions.goToToday}
        roundLabel={content.filters.round.label}
        roundId={interactions.roundId}
        roundOptions={roundOptions}
        onRoundChange={interactions.setRoundId}
        periodLabel={content.filters.period.label}
        period={interactions.period}
        periodOptions={content.filters.period.options}
        onPeriodChange={interactions.setPeriod}
        views={content.views}
        activeView={interactions.view}
        onViewChange={interactions.setView}
      />

      <RoundPlannerToolbar
        searchLabel={content.filters.search.label}
        searchPlaceholder={content.filters.search.placeholder}
        search={interactions.search}
        onSearchChange={interactions.setSearch}
        technicianLabel={content.filters.technician.label}
        technicianId={interactions.technicianId}
        technicianOptions={technicianOptions}
        onTechnicianChange={interactions.setTechnicianId}
        technicianDisabled={interactions.view === 'calendar'}
        technicianDisabledHint={content.filters.technician.unavailableOnCalendar}
        statusLabel={content.filters.status.label}
        statusId={interactions.statusId}
        statusOptions={content.filters.status.options}
        onStatusChange={interactions.setStatusId}
        addRoundLabel={content.actions.addRound}
        onAddRound={onAddRound}
        canAddRound={canMutate}
      />

      <RoundPlannerMetrics metrics={metrics} loading={occurrences.isLoading} />

      {plannerError ? (
        <PanelCard interactive={false} className="flex flex-wrap items-center justify-between gap-3 border-danger/30">
          <p className="text-sm text-danger">
            {content.states.error} {errorMessage(plannerError)}
          </p>
          <button type="button" onClick={refresh} className={cn(dashboardCtaClass, 'px-4 py-2')}>
            {content.states.retry}
          </button>
        </PanelCard>
      ) : null}

      {noRounds && interactions.view !== 'map' ? (
        <EmptyState title={content.states.noRounds} description={content.states.noRoundsHint}>
          {canMutate && onAddRound ? (
            <button type="button" onClick={onAddRound} className={cn(dashboardCtaClass, 'mt-4 px-4 py-2')}>
              <span aria-hidden="true">+</span>
              {content.actions.addRound}
            </button>
          ) : null}
        </EmptyState>
      ) : null}

      {interactions.view === 'calendar' && !noRounds ? (
        <div className="animate-fade-in space-y-3">
          {noVisitsInWindow ? (
            <p className="rounded-xl border border-border bg-surface px-4 py-3 text-xs text-muted">
              <span className="font-semibold text-foreground">{content.states.noVisitsInWindow}.</span>{' '}
              {content.states.noVisitsHint}
            </p>
          ) : null}
          <RoundPlannerCalendar
            weeks={window.weeks}
            cardsByDate={cardsByDate}
            dayHeaders={content.calendar.dayHeaders}
            emptyLabel={content.calendar.emptyLabel}
            stopsLabel={content.calendar.stops}
            unassignedLabel={content.calendar.unassigned}
            today={today}
            currency={currency}
            loading={roundsQuery.isLoading || occurrences.isLoading}
            onSelectCard={(card) => interactions.openRoundDetail({ roundId: card.roundId, date: card.date })}
          />
        </div>
      ) : null}

      {interactions.view === 'map' ? (
        <div className="animate-fade-in">
          <RoundPlannerMapView stops={filteredStops} currency={currency} />
        </div>
      ) : null}

      {interactions.view === 'list' && !noRounds ? (
        <div className="animate-fade-in">
          <RoundPlannerListView
            stops={filteredStops}
            selectedDate={interactions.selectedDate}
            minDate={window.from}
            maxDate={window.to}
            onDateChange={interactions.setSelectedDate}
            onPreviousDay={() => interactions.setSelectedDate(addDays(interactions.selectedDate, -1))}
            onNextDay={() => interactions.setSelectedDate(addDays(interactions.selectedDate, 1))}
            expandedStopId={interactions.expandedStopId}
            onToggleStop={interactions.toggleStop}
            onViewDetails={onViewPropertyDetails ?? (() => undefined)}
            onBulkMessage={onBulkMessage ?? (() => undefined)}
            onAddOneOffJob={onAddOneOffJob ?? (() => undefined)}
            canMutate={canMutate}
            currency={currency}
            loading={roundsQuery.isLoading || day.isLoading}
            filteredOut={dayStops.length > 0 && filteredStops.length === 0}
          />
        </div>
      ) : null}

      <RoundPlannerDetailPanel
        card={
          interactions.selectedCard
            ? (cards.find(
                (card) =>
                  card.roundId === interactions.selectedCard?.roundId &&
                  card.date === interactions.selectedCard?.date,
              ) ?? null)
            : null
        }
        currency={currency}
        canMutate={canMutate}
        onClose={interactions.closeRoundDetail}
        onOpenList={(card) => interactions.openDayIn('list', card)}
        onOpenMap={(card) => interactions.openDayIn('map', card)}
      />
    </div>
  )
}

function EmptyState({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children?: React.ReactNode
}) {
  return (
    <PanelCard interactive={false} className="flex min-h-[16rem] flex-col items-center justify-center text-center">
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      <p className="mt-2 max-w-md text-sm text-muted">{description}</p>
      {children}
    </PanelCard>
  )
}
