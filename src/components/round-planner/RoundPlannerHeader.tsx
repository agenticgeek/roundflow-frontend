import type { RoundPlannerView } from '@/content/round-planner'
import type { RoundPlannerSelectOption } from '@/content/round-planner'
import { IconButton } from '@/components/dashboard/DashboardControls'
import { Select } from '@/components/ui'
import { cn } from '@/lib/utils'

const filterSelectClass =
  'min-w-[7.5rem] border-accent/20 bg-accent-surface font-medium text-foreground shadow-none'

interface RoundPlannerHeaderProps {
  title: string
  subtitle: string
  cycleLabel: string
  syncLabel: string
  syncing: boolean
  onSync: () => void
  weekLabel: string
  weekId: string
  weekOptions: readonly RoundPlannerSelectOption[]
  allWeeksOption: RoundPlannerSelectOption
  onWeekChange: (weekId: string) => void
  areaLabel: string
  areaId: string
  areaOptions: readonly RoundPlannerSelectOption[]
  onAreaChange: (areaId: string) => void
  views: readonly { id: RoundPlannerView; label: string }[]
  activeView: RoundPlannerView
  onViewChange: (view: RoundPlannerView) => void
}

/** Title, cycle, filters row, and view switcher — three distinct rows. */
export function RoundPlannerHeader({
  title,
  subtitle,
  cycleLabel,
  syncLabel,
  syncing,
  onSync,
  weekLabel,
  weekId,
  weekOptions,
  allWeeksOption,
  onWeekChange,
  areaLabel,
  areaId,
  areaOptions,
  onAreaChange,
  views,
  activeView,
  onViewChange,
}: RoundPlannerHeaderProps) {
  return (
    <header className="space-y-3">
      {/* Row 1 — title + cycle */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">{title}</h1>
          <p className="mt-0.5 text-sm text-muted">{subtitle}</p>
        </div>

        <div className="flex shrink-0 items-center gap-1.5 pt-0.5 text-xs font-medium text-muted">
          <span>{cycleLabel}</span>
          <IconButton icon="refresh" label={syncLabel} onClick={onSync} spinning={syncing} />
        </div>
      </div>

      {/* Row 2 — area + week (left) · view toggle (right) */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div>
            <label className="sr-only" htmlFor="round-planner-area">
              {areaLabel}
            </label>
            <Select
              id="round-planner-area"
              inputSize="sm"
              value={areaId}
              onChange={(event) => onAreaChange(event.target.value)}
              options={[...areaOptions]}
              className={cn(filterSelectClass, 'min-w-[8rem]')}
            />
          </div>

          <div>
            <label className="sr-only" htmlFor="round-planner-week">
              {weekLabel}
            </label>
            <Select
              id="round-planner-week"
              inputSize="sm"
              value={weekId}
              onChange={(event) => onWeekChange(event.target.value)}
              options={[allWeeksOption, ...weekOptions]}
              className={cn(filterSelectClass, 'min-w-[9.5rem]')}
            />
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
