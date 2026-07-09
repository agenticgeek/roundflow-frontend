import { cn } from '@/lib/utils'

interface FilterPillsProps<T extends string> {
  options: readonly { id: T; label: string }[]
  value: T
  onChange: (value: T) => void
  /** Outline style for status filters; filled for category filters. */
  variant?: 'filled' | 'outline'
}

/** Reusable horizontal pill filter — category, status, or any enum filter. */
export function FilterPills<T extends string>({
  options,
  value,
  onChange,
  variant = 'filled',
}: FilterPillsProps<T>) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const active = value === option.id
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            className={cn(
              'rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors duration-150',
              variant === 'filled' &&
                (active
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-surface text-foreground hover:bg-border/60'),
              variant === 'outline' &&
                (active
                  ? 'border border-primary text-primary'
                  : 'border border-border text-muted hover:text-foreground'),
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
