import { todaysWorkContent } from '@/content/todays-work'
import type { TodaysWorkInteractions } from '@/hooks/use-todays-work-interactions'
import { CloseOperationalDayModal } from '@/components/todays-work/CloseOperationalDayModal'
import { PushMissedJobsModal } from '@/components/todays-work/PushMissedJobsModal'
import { ReassignTechnicianModal } from '@/components/todays-work/ReassignTechnicianModal'
import { TechnicianWorkload } from '@/components/todays-work/TechnicianWorkload'
import { TodaysWorkHeader } from '@/components/todays-work/TodaysWorkHeader'
import { TodaysWorkMetrics } from '@/components/todays-work/TodaysWorkMetrics'
import { TodaysWorkRoundDetailPanel } from '@/components/todays-work/TodaysWorkRoundDetailPanel'
import { TodaysWorkRoundsTable } from '@/components/todays-work/TodaysWorkRoundsTable'
import { TodaysWorkToolbar } from '@/components/todays-work/TodaysWorkToolbar'

interface TodaysWorkScreenProps {
  interactions: TodaysWorkInteractions
}

/** Composes Today's Work sections — data from content, state from interactions hook. */
export function TodaysWorkScreen({ interactions }: TodaysWorkScreenProps) {
  const { header, metrics, filters, table, workload, technicians } = todaysWorkContent

  return (
    <div className="space-y-6">
      <TodaysWorkHeader
        title={header.title}
        subtitle={header.subtitle}
        date={header.date}
        liveLabel={header.liveLabel}
        lastUpdated={interactions.lastUpdated}
        refreshLabel={header.refreshLabel}
        closeDayLabel={header.closeDay}
        refreshing={interactions.refreshing}
        onRefresh={interactions.refresh}
        onCloseDay={interactions.openCloseDay}
      />

      <TodaysWorkMetrics metrics={metrics} />

      <TodaysWorkToolbar
        searchLabel={filters.search.label}
        searchPlaceholder={filters.search.placeholder}
        search={interactions.search}
        onSearchChange={interactions.setSearch}
        showOnlyProblemsLabel={filters.showOnlyProblems}
        showOnlyProblems={interactions.showOnlyProblems}
        onToggleShowOnlyProblems={interactions.toggleShowOnlyProblems}
      />

      <TodaysWorkRoundsTable
        columns={table.columns}
        emptyLabel={table.emptyLabel}
        rows={interactions.filteredRounds}
        selectedRoundId={interactions.selectedRound?.id ?? null}
        onSelectRound={interactions.openRoundDetail}
      />

      <TechnicianWorkload title={workload.title} items={technicians} />

      <TodaysWorkRoundDetailPanel
        round={interactions.selectedRound}
        onClose={interactions.closeRoundDetail}
        onReassignTechnician={interactions.openReassignTechnician}
        onPushMissedJobs={interactions.openPushMissedJobs}
      />

      <ReassignTechnicianModal
        open={interactions.reassignRound !== null}
        round={interactions.reassignRound}
        onClose={interactions.closeReassignTechnician}
      />

      <PushMissedJobsModal
        open={interactions.pushMissedJobsRound !== null}
        round={interactions.pushMissedJobsRound}
        onClose={interactions.closePushMissedJobs}
      />

      <CloseOperationalDayModal
        open={interactions.closeDayOpen}
        onClose={interactions.closeCloseDay}
      />
    </div>
  )
}
