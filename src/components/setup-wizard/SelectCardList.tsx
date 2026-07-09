import { cn } from '@/lib/utils'

interface SelectCardListProps<T extends string> {
  options: readonly { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
  ariaLabel: string
}

/** Vertical selectable cards — used in modals for single-choice lists. */
export function SelectCardList<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: SelectCardListProps<T>) {
  return (
    <ul role="listbox" aria-label={ariaLabel} className="space-y-2">
      {options.map((option) => {
        const active = value === option.value
        return (
          <li key={option.value} role="option" aria-selected={active}>
            <button
              type="button"
              onClick={() => onChange(option.value)}
              className={cn(
                'w-full rounded-xl border px-4 py-3 text-left text-sm font-medium transition-colors duration-150',
                active
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-border bg-background text-foreground hover:bg-surface',
              )}
            >
              {option.label}
            </button>
          </li>
        )
      })}
    </ul>
  )
}
