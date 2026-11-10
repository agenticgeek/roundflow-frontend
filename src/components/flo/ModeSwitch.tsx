import type { FloMode, FloModeInfo } from '@/api/flo.api'
import { floContent } from '@/content/flo'

/** Thorough, Balanced or Quick as native radio buttons (arrow keys work), styled as a segmented control. */
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
  return (
    <fieldset disabled={disabled} className="min-w-0">
      <legend className="sr-only">{floContent.mode.legend}</legend>
      <div className="flex flex-wrap gap-2">
        {modes.map((mode) => (
          <label
            key={mode.key}
            title={mode.description}
            className="flex min-h-8 cursor-pointer items-center rounded-full border border-border bg-background px-3 py-1 text-sm text-foreground has-[:checked]:border-accent/30 has-[:checked]:bg-accent-surface has-[:checked]:text-accent has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent"
          >
            <input
              type="radio"
              name="flo-mode"
              value={mode.key}
              checked={mode.key === value}
              onChange={() => onChange(mode.key)}
              aria-describedby={`flo-mode-${mode.key}`}
              className="sr-only"
            />
            {mode.label}
            <span id={`flo-mode-${mode.key}`} className="sr-only">
              {mode.description}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}
