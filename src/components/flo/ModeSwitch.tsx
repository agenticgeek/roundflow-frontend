import type { FloMode, FloModeInfo } from '@/api/flo.api'
import { floContent } from '@/content/flo'
import { cn } from '@/lib/utils'

const helperFor = (mode: FloModeInfo) => floContent.mode.helper[mode.key] ?? mode.description

/**
 * Thorough, Balanced or Quick as native radio buttons (arrow keys work), styled as a segmented control
 * whose white thumb slides to the chosen style. The chosen style's helper line sits underneath.
 */
export function ModeSwitch({
  modes,
  value,
  disabled,
  onChange,
}: {
  modes: readonly FloModeInfo[]
  value: FloMode
  disabled: boolean
  onChange: (mode: FloMode) => void
}) {
  const index = Math.max(
    0,
    modes.findIndex((mode) => mode.key === value),
  )
  const current = modes[index]
  return (
    <fieldset disabled={disabled} className="flex w-full min-w-0 flex-col items-center gap-2 disabled:opacity-60 sm:w-auto">
      <legend className="sr-only">{floContent.mode.legend}</legend>
      <div
        className="relative grid h-9 w-full rounded-xl bg-hairline p-1 sm:w-auto"
        style={{ gridTemplateColumns: `repeat(${modes.length}, minmax(0, 1fr))` }}
      >
        <span
          aria-hidden="true"
          className="absolute inset-y-1 left-1 rounded-lg bg-card shadow-sm transition-transform duration-150 ease-out"
          style={{ width: `calc((100% - 0.5rem) / ${modes.length})`, transform: `translateX(${index * 100}%)` }}
        />
        {modes.map((mode) => {
          const checked = mode.key === value
          return (
            <label
              key={mode.key}
              className={cn(
                'relative z-10 flex h-7 cursor-pointer items-center justify-center rounded-lg px-4 text-[13px] font-medium transition-colors duration-150 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary has-[:focus-visible]:ring-offset-2 sm:min-w-24',
                checked ? 'text-accent' : 'text-muted-strong hover:text-foreground',
              )}
            >
              <input
                type="radio"
                name="flo-mode"
                value={mode.key}
                checked={checked}
                onChange={() => onChange(mode.key)}
                aria-describedby={`flo-mode-${mode.key}`}
                className="sr-only"
              />
              {mode.label}
              <span id={`flo-mode-${mode.key}`} className="sr-only">
                {helperFor(mode)}
              </span>
            </label>
          )
        })}
      </div>
      {current ? (
        <p key={current.key} aria-hidden="true" className="animate-fade-in text-[13px] text-muted-strong">
          {helperFor(current)}
        </p>
      ) : null}
    </fieldset>
  )
}
