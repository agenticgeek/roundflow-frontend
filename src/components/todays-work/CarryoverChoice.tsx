import { useId } from 'react'
import type { CarryoverOption, CarryoverTargetKey } from '@/api/carryover.api'
import { carryoverContent } from '@/content/carryover'
import { formatShortDate } from '@/lib/round-dates'

const copy = carryoverContent

/**
 * Where unfinished jobs go (ACT-02..04). Friday always shows Saturday and Monday as a radio group
 * (the server marks Monday as the default); any other day shows one plain sentence. The "tell
 * customers" box is off unless ticked.
 */
export function CarryoverChoice({
  options,
  loading,
  failed,
  value,
  onChange,
  notify,
  onNotify,
  onRetry,
}: {
  options: readonly CarryoverOption[] | undefined
  loading: boolean
  failed: boolean
  value: CarryoverTargetKey | null
  onChange: (key: CarryoverTargetKey) => void
  notify: boolean
  onNotify: (next: boolean) => void
  onRetry: () => void
}) {
  const helpId = useId()
  if (loading) return <p className="text-sm text-muted">{copy.loading}</p>
  if (failed || !options) {
    return (
      <div role="alert" className="text-sm text-danger">
        <p>{copy.loadError}</p>
        <button type="button" onClick={onRetry} className="mt-1 min-h-6 font-semibold text-primary underline underline-offset-2">
          {copy.retry}
        </button>
      </div>
    )
  }
  return (
    <div className="space-y-3">
      {options.length > 1 ? (
        <fieldset className="space-y-1">
          <legend className="text-sm font-semibold text-foreground">{copy.legend}</legend>
          {options.map((option) => (
            <label key={option.key} className="flex min-h-6 cursor-pointer items-center gap-2 py-1 text-sm text-foreground">
              <input
                type="radio"
                name="carryover-target"
                className="h-6 w-6 accent-primary"
                checked={value === option.key}
                onChange={() => onChange(option.key)}
              />
              {copy.optionLabel.replace('{label}', option.label).replace('{date}', formatShortDate(option.date))}
            </label>
          ))}
        </fieldset>
      ) : (
        <p className="text-sm font-medium text-primary">
          {copy.nextWorkingDay.replace('{label}', options[0].label).replace('{date}', formatShortDate(options[0].date))}
        </p>
      )}
      <div>
        <label className="flex min-h-6 cursor-pointer items-center gap-2 text-sm font-medium text-foreground">
          <input
            type="checkbox"
            className="h-6 w-6 accent-primary"
            checked={notify}
            aria-describedby={helpId}
            onChange={(event) => onNotify(event.target.checked)}
          />
          {copy.notify.label}
        </label>
        <p id={helpId} className="ml-8 text-xs text-muted">
          {copy.notify.help}
        </p>
      </div>
    </div>
  )
}
