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
              'rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors duration-150',
              active
                ? 'bg-primary text-primary-foreground'
                : 'border border-border bg-background text-foreground hover:bg-surface',
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
