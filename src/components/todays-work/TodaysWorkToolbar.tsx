import { DashboardIcon } from '@/components/dashboard/DashboardIcon'
import { dashboardCtaToggleClass } from '@/components/dashboard/dashboard-styles'
import { Field, Input } from '@/components/ui'

interface TodaysWorkToolbarProps {
  searchLabel: string
  searchPlaceholder: string
  search: string
  onSearchChange: (value: string) => void
  showOnlyProblemsLabel: string
  showOnlyProblems: boolean
  onToggleShowOnlyProblems: () => void
}

/** Search and problem-only filter above the rounds table. */
export function TodaysWorkToolbar({
  searchLabel,
  searchPlaceholder,
  search,
  onSearchChange,
  showOnlyProblemsLabel,
  showOnlyProblems,
  onToggleShowOnlyProblems,
}: TodaysWorkToolbarProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="w-full sm:max-w-md">
        <Field label={searchLabel} labelWeight="medium" size="sm">
          <div className="relative">
          <DashboardIcon
            name="search"
            className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted"
          />
          <Input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={searchPlaceholder}
            className="pl-9"
          />
        </div>
      </Field>
      </div>

      <button
        type="button"
        aria-pressed={showOnlyProblems}
        onClick={onToggleShowOnlyProblems}
        className={dashboardCtaToggleClass(showOnlyProblems)}
      >
        {showOnlyProblemsLabel}
      </button>
    </div>
  )
}
