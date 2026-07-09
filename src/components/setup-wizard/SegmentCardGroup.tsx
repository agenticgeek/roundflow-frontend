import { cn } from '@/lib/utils'

interface SegmentCardGroupProps<T extends string> {
  options: readonly { id: T; label: string }[]
  value: T
  onChange: (value: T) => void
  ariaLabel: string
}

/** Single-select segmented cards — e.g. recurring cycle options. */
export function SegmentCardGroup<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: SegmentCardGroupProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="grid grid-cols-2 gap-2 sm:grid-cols-4"
    >
      {options.map((option) => {
        const active = value === option.id
        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.id)}
            className={cn(
              'rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors duration-150',
              active
                ? 'border-primary bg-primary/5 text-primary'
                : 'border-border bg-background text-foreground hover:bg-surface',
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
