import { cn } from '@/lib/utils'

interface DaySelectorProps {
  days: readonly { id: string; label: string }[]
  selected: string[]
  onChange: (selected: string[]) => void
  /** `pill` — rounded outline chips (Business Profile); `block` — solid buttons (default). */
  variant?: 'block' | 'pill'
}

/** Multi-select day picker — toggles individual days on/off. */
export function DaySelector({ days, selected, onChange, variant = 'block' }: DaySelectorProps) {
  function toggleDay(id: string) {
    onChange(selected.includes(id) ? selected.filter((d) => d !== id) : [...selected, id])
  }

  return (
    <div className="flex flex-wrap gap-2">
      {days.map((day) => {
        const isSelected = selected.includes(day.id)
        return (
          <button
            key={day.id}
            type="button"
            aria-pressed={isSelected}
            onClick={() => toggleDay(day.id)}
            className={cn(
              'transition-all duration-150 active:scale-[0.97]',
              variant === 'pill'
                ? cn(
                    'min-w-[3.5rem] rounded-full border px-4 py-1.5 text-sm sm:text-[15px]',
                    isSelected
                      ? 'border-primary/30 bg-primary/10 text-foreground'
                      : 'border-border bg-card text-foreground hover:bg-surface',
                  )
                : cn(
                    'min-w-[3.25rem] rounded-lg px-3 py-2 text-sm font-medium',
                    isSelected
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-surface text-foreground hover:bg-border/60',
                  ),
            )}
          >
            {day.label}
          </button>
        )
      })}
    </div>
  )
}
