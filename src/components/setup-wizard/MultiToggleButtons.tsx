import { cn } from '@/lib/utils'

interface MultiToggleButtonsProps<T extends string> {
  options: readonly { id: T; label: string }[]
  value: T[]
  onChange: (value: T[]) => void
  ariaLabel: string
}

/** Multi-select toggle buttons — selected options use the dark primary style. */
export function MultiToggleButtons<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: MultiToggleButtonsProps<T>) {
  function toggle(optionId: T) {
    onChange(
      value.includes(optionId)
        ? value.filter((id) => id !== optionId)
        : [...value, optionId],
    )
  }

  return (
    <div role="group" aria-label={ariaLabel} className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {options.map((option) => {
        const active = value.includes(option.id)
        return (
          <button
            key={option.id}
            type="button"
            aria-pressed={active}
            onClick={() => toggle(option.id)}
            className={cn(
              'flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors duration-150',
              active
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-background text-muted hover:bg-surface hover:text-foreground',
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                'flex h-4 w-4 shrink-0 items-center justify-center rounded-full border',
                active ? 'border-primary-foreground bg-primary-foreground text-primary' : 'border-border',
              )}
            >
              {active ? (
                <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M2.5 6l2.5 2.5 4.5-5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : null}
            </span>
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
