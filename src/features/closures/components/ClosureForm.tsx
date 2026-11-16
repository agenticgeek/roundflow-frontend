import { useId, useRef, useState, type FormEvent } from 'react'
import { Field, FieldError, Input } from '@/components/ui'
import { ModalButton } from '@/components/ui/modal'
import { closuresContent } from '@/content/closures'
import { useCreateClosure, useUpdateClosure } from '@/features/closures/hooks/useClosures'
import {
  CLOSURE_LABEL_MAX,
  CLOSURE_MAX_DAYS,
  type Closure,
  type ClosureCreateInput,
  type ClosureMode,
} from '@/features/closures/types'
import { ApiError } from '@/lib/errors'
import { todayIso } from '@/lib/round-dates'

const copy = closuresContent
const DAY_MS = 86_400_000

export interface ClosureFormProps {
  /** Present when editing. */
  closure?: Closure
  rounds: { id: string; name: string }[]
  onSaved: (closure: Closure) => void
  onCancel: () => void
}

type Errors = Partial<Record<'label' | 'start' | 'end' | 'rounds', string>>

/** Inclusive day count between two `YYYY-MM-DD` dates (UTC maths, so clock changes cannot skew it). */
function inclusiveDays(start: string, end: string): number {
  return Math.round((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / DAY_MS) + 1
}

function validate(values: { label: string; start: string; end: string; scope: 'all' | 'selected'; roundIds: string[] }): Errors {
  const errors: Errors = {}
  const label = values.label.trim()
  if (!label) errors.label = copy.validation.labelRequired
  else if (label.length > CLOSURE_LABEL_MAX) errors.label = copy.validation.labelTooLong
  if (!values.start) errors.start = copy.validation.startRequired
  if (!values.end) errors.end = copy.validation.endRequired
  else if (values.start && values.end < values.start) errors.end = copy.validation.endBeforeStart
  else if (values.start && inclusiveDays(values.start, values.end) > CLOSURE_MAX_DAYS) errors.end = copy.validation.tooLong
  else if (values.end < todayIso()) errors.end = copy.validation.endInPast
  if (values.scope === 'selected' && values.roundIds.length === 0) errors.rounds = copy.validation.roundsRequired
  return errors
}

/**
 * Add or edit one closure (a form, not a dialog: the caller puts it in a Modal). Validates the rules the
 * server enforces so most mistakes are caught early, maps the server's error `code` to a message, ignores a
 * second submit while one is in flight and keeps what was typed when a save fails.
 */
export function ClosureForm({ closure, rounds, onSaved, onCancel }: ClosureFormProps) {
  const create = useCreateClosure()
  const update = useUpdateClosure()
  const notifyHelpId = useId()
  const submitting = useRef(false)
  const [label, setLabel] = useState(closure?.label ?? '')
  const [start, setStart] = useState(closure?.startDate ?? '')
  const [end, setEnd] = useState(closure?.endDate ?? '')
  const [mode, setMode] = useState<ClosureMode>(closure?.mode ?? 'MOVE')
  const [scope, setScope] = useState<'all' | 'selected'>(closure && closure.roundIds.length > 0 ? 'selected' : 'all')
  const [roundIds, setRoundIds] = useState<string[]>(closure?.roundIds ?? [])
  const [notify, setNotify] = useState(closure?.notifyCustomers ?? false)
  const [errors, setErrors] = useState<Errors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  function toggleRound(id: string, checked: boolean) {
    setRoundIds((current) => (checked ? [...current, id] : current.filter((item) => item !== id)))
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (submitting.current) return
    const found = validate({ label, start, end, scope, roundIds })
    setErrors(found)
    setFormError(null)
    if (Object.keys(found).length > 0) return
    const input: ClosureCreateInput = {
      label: label.trim(),
      startDate: start,
      endDate: end,
      mode,
      notifyCustomers: notify,
      roundIds: scope === 'all' ? [] : roundIds,
    }
    submitting.current = true
    setSaving(true)
    try {
      const saved = closure ? await update.mutateAsync({ id: closure.id, input }) : await create.mutateAsync(input)
      onSaved(saved)
    } catch (caught) {
      const known = caught instanceof ApiError && caught.code ? copy.errors[caught.code] : undefined
      setFormError(known ?? copy.errorFallback)
    } finally {
      submitting.current = false
      setSaving(false)
    }
  }

  return (
    <form noValidate onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
      <div>
        <Field label={copy.form.label.label} required error={errors.label} labelWeight="medium" size="sm">
          <Input
            inputSize="sm"
            value={label}
            placeholder={copy.form.label.placeholder}
            aria-invalid={errors.label ? true : undefined}
            onChange={(event) => setLabel(event.target.value)}
          />
        </Field>
        <p className="mt-1 text-xs text-muted">{copy.form.label.help}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={copy.form.start.label} required error={errors.start} labelWeight="medium" size="sm">
          <Input
            inputSize="sm"
            type="date"
            value={start}
            aria-invalid={errors.start ? true : undefined}
            onChange={(event) => setStart(event.target.value)}
          />
        </Field>
        <div>
          <Field label={copy.form.end.label} required error={errors.end} labelWeight="medium" size="sm">
            <Input
              inputSize="sm"
              type="date"
              value={end}
              aria-invalid={errors.end ? true : undefined}
              onChange={(event) => setEnd(event.target.value)}
            />
          </Field>
          <p className="mt-1 text-xs text-muted">{copy.form.end.help}</p>
        </div>
      </div>

      <fieldset className="space-y-1">
        <legend className="text-sm font-semibold text-foreground">{copy.form.mode.legend}</legend>
        {(['MOVE', 'SKIP'] as const).map((value) => {
          const option = value === 'MOVE' ? copy.form.mode.move : copy.form.mode.skip
          return (
            <label key={value} className="flex min-h-6 cursor-pointer items-start gap-2 py-1 text-sm text-foreground">
              <input
                type="radio"
                name="closure-mode"
                className="mt-0.5 h-6 w-6 shrink-0 accent-primary"
                checked={mode === value}
                onChange={() => setMode(value)}
              />
              <span>
                <span className="font-medium">{option.label}</span>
                <span className="block text-xs text-muted">{option.description}</span>
              </span>
            </label>
          )
        })}
        {mode === 'MOVE' ? <p className="ml-8 text-xs text-muted">{copy.form.mode.moveNote}</p> : null}
      </fieldset>

      <fieldset className="space-y-1">
        <legend className="text-sm font-semibold text-foreground">{copy.form.rounds.legend}</legend>
        <label className="flex min-h-6 cursor-pointer items-center gap-2 py-1 text-sm text-foreground">
          <input
            type="radio"
            name="closure-scope"
            className="h-6 w-6 accent-primary"
            checked={scope === 'all'}
            onChange={() => setScope('all')}
          />
          {copy.form.rounds.all}
        </label>
        <label className="flex min-h-6 cursor-pointer items-center gap-2 py-1 text-sm text-foreground">
          <input
            type="radio"
            name="closure-scope"
            className="h-6 w-6 accent-primary"
            checked={scope === 'selected'}
            onChange={() => setScope('selected')}
          />
          {copy.form.rounds.specific}
        </label>
        {scope === 'selected' ? (
          <div className="ml-8 space-y-1">
            <p className="text-xs text-muted">{copy.form.rounds.help}</p>
            {rounds.length === 0 ? <p className="text-xs text-muted">{copy.form.rounds.noneAvailable}</p> : null}
            {rounds.map((round) => (
              <label key={round.id} className="flex min-h-6 cursor-pointer items-center gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  className="h-6 w-6 accent-primary"
                  checked={roundIds.includes(round.id)}
                  onChange={(event) => toggleRound(round.id, event.target.checked)}
                />
                {round.name}
              </label>
            ))}
          </div>
        ) : null}
        {errors.rounds ? <FieldError message={errors.rounds} size="sm" /> : null}
      </fieldset>

      <div>
        <label className="flex min-h-6 cursor-pointer items-center gap-2 text-sm font-medium text-foreground">
          <input
            type="checkbox"
            className="h-6 w-6 accent-primary"
            checked={notify}
            aria-describedby={notifyHelpId}
            onChange={(event) => setNotify(event.target.checked)}
          />
          {copy.form.notify.label}
        </label>
        <p id={notifyHelpId} className="ml-8 text-xs text-muted">
          {copy.form.notify.help}
        </p>
      </div>

      {formError ? <FieldError message={formError} size="sm" /> : null}

      <div className="grid grid-cols-2 gap-3">
        <ModalButton compact variant="secondary" className="w-full" onClick={onCancel}>
          {copy.form.cancel}
        </ModalButton>
        <ModalButton compact variant="primary" type="submit" className="w-full" loading={saving}>
          {saving ? copy.form.saving : copy.form.save}
        </ModalButton>
      </div>
    </form>
  )
}
