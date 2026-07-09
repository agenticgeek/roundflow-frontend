import { roundPlannerContent } from '@/content/round-planner'
import type { RoundPlannerInteractions } from '@/hooks/use-round-planner-interactions'
import { RoundPlannerCalendar } from '@/components/round-planner/RoundPlannerCalendar'
import { RoundPlannerDetailPanel } from '@/components/round-planner/RoundPlannerDetailPanel'
import { RoundPlannerHeader } from '@/components/round-planner/RoundPlannerHeader'
import { RoundPlannerListView } from '@/components/round-planner/RoundPlannerListView'
import { RoundPlannerMapView } from '@/components/round-planner/RoundPlannerMapView'
import { RoundPlannerMetrics } from '@/components/round-planner/RoundPlannerMetrics'
import { RemovePropertyFromRoundModal } from '@/components/round-planner/RemovePropertyFromRoundModal'
import { RoundPlannerToolbar } from '@/components/round-planner/RoundPlannerToolbar'

interface RoundPlannerScreenProps {
  interactions: RoundPlannerInteractions
  onBulkMessage?: () => void
  onAddOneOffJob?: () => void
  onViewPropertyDetails?: (propertyId: string) => void
}

/** Composes Round Planner sections — data from content, state from interactions hook. */
export function RoundPlannerScreen({
  interactions,
  onBulkMessage,
  onAddOneOffJob,
  onViewPropertyDetails,
}: RoundPlannerScreenProps) {
  const {
    header,
    views,
    filters,
    actions,
    allWeeksOption,
    weeks,
    areas,
    technicians,
    statuses,
    metrics,
    calendar,
  } = roundPlannerContent
  const mapRound =
    interactions.filteredDays.flatMap((day) => day.rounds)[0] ??
    roundPlannerContent.days.flatMap((day) => day.rounds)[0] ??
    null

  return (
    <div className="space-y-4">
      <RoundPlannerHeader
        title={header.title}
        subtitle={header.subtitle}
        cycleLabel={header.cycleLabel}
        syncLabel={header.syncLabel}
        syncing={interactions.syncing}
        onSync={interactions.syncCycle}
        weekLabel={filters.week.label}
        weekId={interactions.weekId}
        weekOptions={weeks.map((week) => ({ value: week.value, label: week.label }))}
        allWeeksOption={allWeeksOption}
        onWeekChange={interactions.setWeekId}
        areaLabel={filters.area.label}
        areaId={interactions.areaId}
        areaOptions={areas}
        onAreaChange={interactions.setAreaId}
        views={views}
        activeView={interactions.view}
        onViewChange={interactions.setView}
      />

      <RoundPlannerToolbar
        searchLabel={filters.search.label}
        searchPlaceholder={filters.search.placeholder}
        search={interactions.search}
        onSearchChange={interactions.setSearch}
        technicianLabel={filters.technician.label}
        technicianId={interactions.technicianId}
        technicianOptions={technicians}
        onTechnicianChange={interactions.setTechnicianId}
        statusLabel={filters.status.label}
        statusId={interactions.statusId}
        statusOptions={statuses}
        onStatusChange={interactions.setStatusId}
        addRoundLabel={actions.addRound}
      />

      <RoundPlannerMetrics metrics={metrics} />

      {interactions.view === 'calendar' ? (
        <RoundPlannerCalendar
          weeks={interactions.visibleWeeks}
          days={interactions.filteredDays}
          dayHeaders={calendar.dayHeaders}
          emptyLabel={calendar.emptyLabel}
          onSelectRound={interactions.openRoundDetail}
        />
      ) : null}

      {interactions.view === 'map' ? (
        <RoundPlannerMapView round={mapRound} />
      ) : null}

      {interactions.view === 'list' ? (
        <RoundPlannerListView
          items={interactions.filteredListItems}
          expandedItemId={interactions.expandedListItemId}
          onToggleItem={interactions.toggleListItem}
          onViewDetails={onViewPropertyDetails ?? (() => undefined)}
          onBulkMessage={onBulkMessage ?? (() => undefined)}
          onAddOneOffJob={onAddOneOffJob ?? (() => undefined)}
          onRemoveProperty={interactions.openRemoveProperty}
        />
      ) : null}

      <RemovePropertyFromRoundModal
        open={interactions.removePropertyItem !== null}
        item={interactions.removePropertyItem}
        onClose={interactions.closeRemoveProperty}
      />

      <RoundPlannerDetailPanel
        round={interactions.selectedRound?.round ?? null}
        dateLabel={interactions.selectedRound?.dateLabel}
        onClose={interactions.closeRoundDetail}
      />
    </div>
  )
}
