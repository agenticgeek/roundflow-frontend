import { useMemo, useState } from 'react'
import { roundPlannerContent } from '@/content/round-planner'
import { IconButton } from '@/components/dashboard/DashboardControls'
import { RoundPlannerMapView } from '@/components/round-planner/RoundPlannerMapView'
import { useRoundsOccurrenceDays } from '@/features/rounds/hooks/useRounds'
import {
  addDays,
  formatLongDate,
  formatShortDate,
  type PlannerListStop,
} from '@/features/rounds/lib/planner'
import {
  filterPlannerStops,
  stopsForDates,
  weekDates,
  type MapMode,
  type PlannerStopFilter,
} from '@/features/maps/lib/stops'
import { cn, fillCopy } from '@/lib/utils'

interface RoundPlannerMapSectionProps {
  /** Rounds in scope (the header's round filter). */
  rounds: readonly { id: string; name: string }[]
  /** The selected day's stops, already filtered like the List. */
  dayStops: readonly PlannerListStop[]
  filter: PlannerStopFilter
  selectedDate: string
  minDate: string
  maxDate: string
  onDateChange: (date: string) => void
  currency: string
}

/**
 * Map tab with its own date controls (GAP-023): the same day picker as the List, or a whole
 * week — the 7 days are fetched in parallel and every stop is pinned, coloured by status, with
 * the round / technician / status / search filters applied.
 */
export function RoundPlannerMapSection({
  rounds,
  dayStops,
  filter,
  selectedDate,
  minDate,
  maxDate,
  onDateChange,
  currency,
}: RoundPlannerMapSectionProps) {
  const copy = roundPlannerContent.mapView.controls
  const [mode, setMode] = useState<MapMode>('day')

  const dates = useMemo(() => weekDates(selectedDate), [selectedDate])
  const roundIds = useMemo(() => rounds.map((round) => round.id), [rounds])
  const requests = useMemo(() => dates.map((date) => ({ date, roundIds })), [dates, roundIds])
  const week = useRoundsOccurrenceDays(requests, mode === 'week')

  const weekStops = useMemo(
    () => filterPlannerStops(stopsForDates(week.byDate, dates, rounds), filter),
    [dates, filter, rounds, week.byDate],
  )

  const stepDays = mode === 'week' ? 7 : 1
  const first = mode === 'week' ? dates[0]! : selectedDate
  const last = mode === 'week' ? dates[6]! : selectedDate
  const atStart = first <= minDate
  const atEnd = last >= maxDate

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div role="radiogroup" aria-label={copy.modeLabel} className="inline-flex rounded-lg bg-accent-surface p-0.5">
          {(['day', 'week'] as const).map((value) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={mode === value}
              onClick={() => setMode(value)}
              className={cn(
                'rounded-md px-3 py-1 text-xs font-semibold transition-colors',
                mode === value ? 'bg-card text-foreground shadow-sm' : 'text-muted hover:text-foreground',
              )}
            >
              {copy[value]}
            </button>
          ))}
        </div>

        <div className="inline-flex items-center rounded-lg bg-accent-surface p-0.5">
          <IconButton
            icon="chevron-left"
            label={mode === 'week' ? copy.previousWeek : copy.previousDay}
            onClick={() => onDateChange(addDays(selectedDate, -stepDays))}
            className={atStart ? 'pointer-events-none opacity-40' : undefined}
          />
          <label className="flex items-center gap-2 px-2 text-xs font-semibold text-foreground">
            <span>
              {mode === 'week' ? fillCopy(copy.weekOf, { date: formatShortDate(first) }) : formatLongDate(selectedDate)}
            </span>
            <input
              type="date"
              value={selectedDate}
              min={minDate}
              max={maxDate}
              onChange={(event) => {
                if (event.target.value) onDateChange(event.target.value)
              }}
              className="w-7 cursor-pointer rounded-md border border-border bg-background text-transparent [color-scheme:light] focus:outline-none"
              aria-label={copy.dateLabel}
            />
          </label>
          <IconButton
            icon="chevron-right"
            label={mode === 'week' ? copy.nextWeek : copy.nextDay}
            onClick={() => onDateChange(addDays(selectedDate, stepDays))}
            className={atEnd ? 'pointer-events-none opacity-40' : undefined}
          />
        </div>
      </div>

      <RoundPlannerMapView stops={mode === 'week' ? weekStops : dayStops} currency={currency} />
    </div>
  )
}
