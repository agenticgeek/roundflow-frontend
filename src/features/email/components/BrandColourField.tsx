import { useId } from 'react'
import type { BrandColourCheck } from '@/api/email-settings.api'
import { Field, Input } from '@/components/ui'
import { emailSettingsContent } from '@/content/email-settings'
import { checkBrandColour, normaliseHex } from '@/features/email/lib/colour'
import { fillCopy } from '@/lib/utils'

const copy = emailSettingsContent.colour

/**
 * Brand colour input with a live contrast preview. The numbers are computed here as you type; once the
 * saved colour matches the one being edited, the backend's own check (warning, safe accent colour) wins.
 */
export function BrandColourField({
  value,
  onChange,
  serverCheck,
  disabled = false,
}: {
  value: string
  onChange: (value: string) => void
  serverCheck: BrandColourCheck | null
  disabled?: boolean
}) {
  const helpId = useId()
  const hex = normaliseHex(value)
  const invalid = value.trim() !== '' && !hex
  const server = hex && serverCheck?.colour.toUpperCase() === hex ? serverCheck : null
  const local = hex ? checkBrandColour(hex) : null
  const warn = server ? Boolean(server.warning) : Boolean(local?.lowContrastOnWhite)
  const textColour = server?.textColour ?? local?.textColour
  const contrast = server?.buttonContrast ?? local?.buttonContrast
  const safe = server?.warning?.safeAccentColour

  return (
    <div className="space-y-3">
      <Field label={copy.label} labelWeight="medium" error={invalid ? copy.invalid : null}>
        <div className="flex items-center gap-3">
          <Input
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder="#00758C"
            readOnly={disabled}
            aria-invalid={invalid || undefined}
            aria-describedby={helpId}
            autoComplete="off"
            className="max-w-[10rem]"
          />
          <input
            type="color"
            aria-label={copy.pick}
            value={hex ?? '#000000'}
            disabled={disabled}
            onChange={(event) => onChange(event.target.value.toUpperCase())}
            className="h-10 w-12 cursor-pointer rounded border border-border bg-card disabled:cursor-not-allowed disabled:opacity-60"
          />
          {value && !disabled ? (
            <button type="button" onClick={() => onChange('')} className="text-sm font-semibold text-primary underline underline-offset-2">
              {copy.clear}
            </button>
          ) : null}
        </div>
        <p id={helpId} className="mt-1 text-xs text-muted">
          {copy.help}
        </p>
      </Field>

      {hex && textColour && contrast !== undefined ? (
        <div aria-live="polite" className="space-y-2 text-sm">
          <div role="group" aria-label={copy.previewLabel}>
            <span className="inline-block rounded-lg px-4 py-2 font-semibold" style={{ backgroundColor: hex, color: textColour }}>
              {copy.previewButton}
            </span>
          </div>
          <p className="text-foreground">{fillCopy(copy.buttonContrast, { ratio: contrast.toFixed(1) })}</p>
          <p className="text-foreground">{fillCopy(copy.safeTextColour, { colour: textColour })}</p>
          {warn ? (
            <div className="rounded-lg border border-warning/40 bg-warning-surface px-3 py-2 text-warning-foreground">
              <p className="font-semibold">{copy.warningTitle}</p>
              <p>{safe ? fillCopy(copy.warningBody, { safe }) : copy.warningBodyNoSafe}</p>
            </div>
          ) : (
            <p className="text-success">{copy.ok}</p>
          )}
        </div>
      ) : null}
    </div>
  )
}
