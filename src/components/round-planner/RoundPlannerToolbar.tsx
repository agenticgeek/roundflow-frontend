import type { RoundPlannerSelectOption } from '@/content/round-planner'
import { dashboardCtaClass } from '@/components/dashboard/dashboard-styles'
import { Select } from '@/components/ui'
import { cn } from '@/lib/utils'

interface RoundPlannerToolbarProps {
  searchLabel: string
  searchPlaceholder: string
  search: string
  onSearchChange: (value: string) => void
  technicianLabel: string
  technicianId: string
  technicianOptions: readonly RoundPlannerSelectOption[]
  onTechnicianChange: (id: string) => void
  statusLabel: string
  statusId: string
  statusOptions: readonly RoundPlannerSelectOption[]
  onStatusChange: (id: string) => void
  addRoundLabel: string
  onAddRound?: () => void
}

const filterSelectClass =
  'w-auto min-w-[7.5rem] shrink-0 border-accent/20 bg-accent-surface font-medium text-foreground shadow-none'

/** Search + inline filters + add-round — single aligned row. */
export function RoundPlannerToolbar({
  searchLabel,
  searchPlaceholder,
  search,
  onSearchChange,
  technicianLabel,
  technicianId,
  technicianOptions,
  onTechnicianChange,
  statusLabel,
  statusId,
  statusOptions,
  onStatusChange,
  addRoundLabel,
  onAddRound,
}: RoundPlannerToolbarProps) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
      <label className="relative min-w-0 flex-1">
        <span className="sr-only">{searchLabel}</span>
        <SearchIcon />
        <input
          type="search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={searchPlaceholder}
          className={cn(
            'w-full rounded-xl border border-border bg-background py-2 pr-3 pl-9 text-sm text-foreground',
            'outline-none transition-[border-color,box-shadow] placeholder:text-muted',
            'focus:border-primary focus:ring-4 focus:ring-primary/10',
          )}
        />
      </label>

      <div className="flex items-center gap-2">
        <Select
          inputSize="sm"
          aria-label={technicianLabel}
          value={technicianId}
          onChange={(event) => onTechnicianChange(event.target.value)}
          options={[...technicianOptions]}
          className={filterSelectClass}
        />
        <Select
          inputSize="sm"
          aria-label={statusLabel}
          value={statusId}
          onChange={(event) => onStatusChange(event.target.value)}
          options={[...statusOptions]}
          className={filterSelectClass}
        />
        <button type="button" onClick={onAddRound} className={cn(dashboardCtaClass, 'shrink-0 px-4 py-2')}>
          <span aria-hidden="true">+</span>
          {addRoundLabel}
        </button>
      </div>
    </div>
  )
}

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted"
      aria-hidden="true"
    >
      <path d="M10.5 10.5 15 15" />
      <path d="M11 17a6 6 0 1 0 0-12 6 6 0 0 0 0 12Z" />
    </svg>
  )
}
