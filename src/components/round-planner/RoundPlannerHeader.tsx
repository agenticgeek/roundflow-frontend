import type { RoundPlannerSelectOption, RoundPlannerView } from '@/content/round-planner'
import type { PlannerPeriod } from '@/features/rounds/lib/planner'
import { IconButton } from '@/components/dashboard/DashboardControls'
import { Select } from '@/components/ui'
import { cn } from '@/lib/utils'

const filterSelectClass =
  'min-w-[7.5rem] border-accent/20 bg-accent-surface font-medium text-foreground shadow-none'

interface RoundPlannerHeaderProps {
  title: string
  subtitle: string
  windowLabel: string
  syncLabel: string
  syncing: boolean
  onSync: () => void
  previousLabel: string
  nextLabel: string
  todayLabel: string
  onPrevious: () => void
  onNext: () => void
  onToday: () => void
  roundLabel: string
  roundId: string
  roundOptions: readonly RoundPlannerSelectOption[]
  onRoundChange: (roundId: string) => void
  periodLabel: string
  period: PlannerPeriod
  periodOptions: readonly { value: PlannerPeriod; label: string }[]
  onPeriodChange: (period: PlannerPeriod) => void
  views: readonly { id: RoundPlannerView; label: string }[]
  activeView: RoundPlannerView
  onViewChange: (view: RoundPlannerView) => void
}

/** Title + window label, round/period selectors with paging, and the view switcher. */
export function RoundPlannerHeader({
  title,
  subtitle,
  windowLabel,
  syncLabel,
  syncing,
  onSync,
  previousLabel,
  nextLabel,
  todayLabel,
  onPrevious,
  onNext,
  onToday,
  roundLabel,
  roundId,
  roundOptions,
  onRoundChange,
  periodLabel,
  period,
  periodOptions,
  onPeriodChange,
  views,
  activeView,
  onViewChange,
}: RoundPlannerHeaderProps) {
  return (
    <header className="space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">{title}</h1>
          <p className="mt-0.5 text-sm text-muted">{subtitle}</p>
        </div>

        <div className="flex shrink-0 items-center gap-1.5 pt-0.5 text-xs font-medium text-muted">
          <span>{windowLabel}</span>
          <IconButton icon="refresh" label={syncLabel} onClick={onSync} spinning={syncing} />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div>
            <label className="sr-only" htmlFor="round-planner-round">
              {roundLabel}
            </label>
            <Select
              id="round-planner-round"
              inputSize="sm"
              value={roundId}
              onChange={(event) => onRoundChange(event.target.value)}
              options={[...roundOptions]}
              className={cn(filterSelectClass, 'min-w-[9rem]')}
            />
          </div>

          <div>
            <label className="sr-only" htmlFor="round-planner-period">
              {periodLabel}
            </label>
            <Select
              id="round-planner-period"
              inputSize="sm"
              value={period}
              onChange={(event) => onPeriodChange(event.target.value as PlannerPeriod)}
              options={[...periodOptions]}
              className={cn(filterSelectClass, 'min-w-[6.5rem]')}
            />
          </div>

          <div className="inline-flex items-center rounded-lg bg-accent-surface p-0.5">
            <IconButton icon="chevron-left" label={previousLabel} onClick={onPrevious} />
            <button
              type="button"
              onClick={onToday}
              className="rounded-md px-2 py-1 text-xs font-semibold text-foreground transition-colors hover:text-accent"
            >
              {todayLabel}
            </button>
            <IconButton icon="chevron-right" label={nextLabel} onClick={onNext} />
          </div>
        </div>

        <RoundPlannerViewToggle views={views} activeView={activeView} onViewChange={onViewChange} />
      </div>
    </header>
  )
}

function RoundPlannerViewToggle({
  views,
  activeView,
  onViewChange,
}: {
  views: readonly { id: RoundPlannerView; label: string }[]
  activeView: RoundPlannerView
  onViewChange: (view: RoundPlannerView) => void
}) {
  return (
    <div className="inline-flex rounded-lg bg-accent-surface p-1">
      {views.map((view) => {
        const active = activeView === view.id

        return (
          <button
            key={view.id}
            type="button"
            aria-pressed={active}
            onClick={() => onViewChange(view.id)}
            className={cn(
              'rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors duration-150',
              active
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-foreground hover:text-accent',
            )}
          >
            {view.label}
          </button>
        )
      })}
    </div>
  )
}
