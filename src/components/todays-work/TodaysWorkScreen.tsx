import { useMemo } from 'react'
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
import { mergeRoundTodayDetail } from '@/features/today/lib/mappers'
import { useRoundToday } from '@/features/today/hooks/useToday'
import { TodaysWorkScreenSkeleton } from '@/components/todays-work/TodaysWorkSkeletons'
import { PanelCard } from '@/components/dashboard/DashboardControls'
import { dashboardCtaClass } from '@/components/dashboard/dashboard-styles'
import { cn } from '@/lib/utils'
import { useAppBootstrap } from '@/providers/AppBootstrapProvider'

interface TodaysWorkScreenProps {
  interactions: TodaysWorkInteractions
}

/** Composes Today's Work — aggregate from GET /today, detail from GET /rounds/:id/today. */
export function TodaysWorkScreen({ interactions }: TodaysWorkScreenProps) {
  const { header, filters, table, workload } = todaysWorkContent
  const { canMutate } = useAppBootstrap()
  const { todayQuery } = interactions

  const detailQuery = useRoundToday(
    interactions.selectedRound?.id ?? '',
    Boolean(interactions.selectedRound),
  )

  const selectedRound = useMemo(() => {
    if (!interactions.selectedRound) return null
    return mergeRoundTodayDetail(interactions.selectedRound, detailQuery.data)
  }, [detailQuery.data, interactions.selectedRound])

  return (
    <div className="space-y-6">
      <TodaysWorkHeader
        title={header.title}
        subtitle={header.subtitle}
        date={interactions.dateLabel}
        liveLabel={interactions.dayClosed ? 'CLOSED' : header.liveLabel}
        lastUpdated={interactions.lastUpdated}
        refreshLabel={header.refreshLabel}
        closeDayLabel={header.closeDay}
        refreshing={interactions.refreshing}
        onRefresh={interactions.refresh}
        onCloseDay={
          canMutate && !interactions.dayClosed ? interactions.openCloseDay : undefined
        }
        closeDayDisabled={!canMutate || interactions.dayClosed}
      />

      {todayQuery.isPending ? (
        <TodaysWorkScreenSkeleton />
      ) : todayQuery.isError ? (
        <PanelCard interactive={false} className="py-10 text-center text-sm text-muted">
          <p>Could not load today&apos;s work.</p>
          <button
            type="button"
            className={cn(dashboardCtaClass, 'mt-3')}
            onClick={() => void todayQuery.refetch()}
          >
            Retry
          </button>
        </PanelCard>
      ) : (
        <>
          <TodaysWorkMetrics metrics={interactions.metrics} />

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

          <TechnicianWorkload title={workload.title} items={interactions.technicians} />
        </>
      )}

      <TodaysWorkRoundDetailPanel
        round={selectedRound}
        loading={detailQuery.isPending}
        onClose={interactions.closeRoundDetail}
        onReassignTechnician={canMutate ? interactions.openReassignTechnician : undefined}
        onPushMissedJobs={canMutate ? interactions.openPushMissedJobs : undefined}
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
        dateLabel={interactions.dateLabel}
        kpi={todayQuery.data?.kpi}
        onClose={interactions.closeCloseDay}
      />
    </div>
  )
}
