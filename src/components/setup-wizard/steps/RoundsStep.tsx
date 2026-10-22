import type { FormEvent } from 'react'
import { useMemo, useRef, useState } from 'react'
import type { RoundCreateInput } from '@/api/rounds.api'
import type { CleaningFrequency, DayOfWeek, Round, ServiceArea } from '@/api/types'
import { setupWizardContent } from '@/content/setup-wizard'
import { setupStepPosition } from '@/config/setup-wizard'
import { Field, FieldError, Input, Select } from '@/components/ui'
import { cn } from '@/lib/utils'

interface RoundsStepProps {
  areas: ServiceArea[]
  rounds: Round[]
  /** Business working days from Business Profile (`MON`…`SUN`); empty = all days. */
  workingDays: string[]
  defaultFrequency: CleaningFrequency
  saving: boolean
  /** Resolves with the created round's id. */
  onCreateRound: (input: RoundCreateInput) => Promise<string | undefined>
  onUpdateRound: (id: string, input: RoundCreateInput) => Promise<void>
  onSubmit: () => void
}

interface RoundForm {
  serviceAreaId: string
  name: string
  defaultDay: string
  frequency: string
}

type RoundFormErrors = Partial<Record<'serviceAreaId' | 'name' | 'defaultDay', string>>

/** Backend step numbers the copy points at — shown as their stepper position. */
const BUSINESS_STEP = 1
const PROPERTIES_STEP = 9

function fill(template: string, values: Record<string, string | number>): string {
  return Object.entries(values).reduce(
    (text, [key, value]) => text.replaceAll(`{${key}}`, String(value)),
    template,
  )
}

function splitSectors(value: string | null | undefined): string[] {
  return value ? value.split(/[,;]/).map((sector) => sector.trim()).filter(Boolean) : []
}

function RoundsIcon() {
  return (
    <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6" aria-hidden="true">
        <circle cx="6" cy="18" r="2" />
        <circle cx="18" cy="6" r="2" />
        <path d="M8 18h7.5a3.5 3.5 0 0 0 0-7h-7a3.5 3.5 0 0 1 0-7H16" strokeLinecap="round" />
      </svg>
    </span>
  )
}

function InfoIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true">
      <circle cx="10" cy="10" r="7.5" />
      <path d="M10 9v4.5M10 6.5v.01" strokeLinecap="round" />
    </svg>
  )
}

function WarningIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true">
      <path d="M10 3 2.5 16.5h15L10 3Z" strokeLinejoin="round" />
      <path d="M10 8.5v3.5M10 14.5v.01" strokeLinecap="round" />
    </svg>
  )
}

function SectorChip({ sector, selected, onClick }: { sector: string; selected?: boolean; onClick?: () => void }) {
  const className = cn(
    'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors',
    selected ? 'border-primary/25 bg-primary/10 text-foreground' : 'border-border bg-card text-foreground',
  )
  if (!onClick) return <span className={className}>{sector}</span>
  return (
    <button type="button" aria-pressed={selected} onClick={onClick} className={cn(className, !selected && 'hover:bg-surface')}>
      {selected ? (
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" className="h-3 w-3" aria-hidden="true">
          <path d="M3.5 8.5l3 3 6-7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : null}
      {sector}
    </button>
  )
}

export function RoundsStep({
  areas,
  rounds,
  workingDays,
  defaultFrequency,
  saving,
  onCreateRound,
  onUpdateRound,
  onSubmit,
}: RoundsStepProps) {
  const content = setupWizardContent.rounds
  const { form: formContent, areaCard } = content
  const { fields, validation } = formContent

  const savedAreas = useMemo(() => areas.filter((area): area is ServiceArea & { id: string } => Boolean(area.id)), [areas])

  const emptyForm = (serviceAreaId = savedAreas[0]?.id ?? ''): RoundForm => ({
    serviceAreaId,
    name: '',
    defaultDay: '',
    frequency: defaultFrequency,
  })

  const [form, setForm] = useState<RoundForm>(() => emptyForm())
  const [errors, setErrors] = useState<RoundFormErrors>({})
  const [saveError, setSaveError] = useState<string | null>(null)
  const [stepError, setStepError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  // CONTRACT-DIFF: rounds have no postcode sectors in the API yet — kept in this step only.
  const [roundSectors, setRoundSectors] = useState<Record<string, string[]>>({})
  const [formSectors, setFormSectors] = useState<string[]>([])
  const formCardRef = useRef<HTMLElement>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)

  const dayLabel = (value: string | null | undefined) =>
    content.days.find((day) => day.value === value)?.label ?? '—'
  const frequencyLabel = (value: string | null | undefined) =>
    content.frequencies.find((frequency) => frequency.value === value)?.label ?? '—'

  const dayOptions = useMemo(() => {
    const allowed = new Set(workingDays)
    const editingDay = rounds.find((round) => round.id === editingId)?.defaultDay
    return content.days.filter(
      (day) => allowed.size === 0 || allowed.has(day.value) || day.value === editingDay,
    )
  }, [content.days, workingDays, rounds, editingId])

  const selectedArea = savedAreas.find((area) => area.id === form.serviceAreaId)
  const selectedAreaSectors = splitSectors(selectedArea?.postcodeSector)
  const namePlaceholder =
    selectedArea && form.defaultDay
      ? fill(fields.name.placeholderFor, { area: selectedArea.name ?? '', day: dayLabel(form.defaultDay) })
      : fields.name.placeholder

  function updateForm<K extends keyof RoundForm>(key: K, value: RoundForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => (prev[key as keyof RoundFormErrors] ? { ...prev, [key]: undefined } : prev))
    setSaveError(null)
  }

  function chooseArea(serviceAreaId: string) {
    updateForm('serviceAreaId', serviceAreaId)
    // Sectors belong to one area — drop picks from the previous one.
    setFormSectors([])
  }

  function toggleSector(sector: string) {
    setFormSectors((prev) => (prev.includes(sector) ? prev.filter((item) => item !== sector) : [...prev, sector]))
  }

  function resetForm(serviceAreaId?: string) {
    setForm(emptyForm(serviceAreaId))
    setFormSectors([])
    setErrors({})
    setSaveError(null)
    setEditingId(null)
  }

  function startRoundFor(areaId: string) {
    resetForm(areaId)
    formCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    nameInputRef.current?.focus({ preventScroll: true })
  }

  function editRound(round: Round) {
    if (!round.id) return
    setEditingId(round.id)
    setForm({
      serviceAreaId: round.serviceAreaId ?? '',
      name: round.name ?? '',
      defaultDay: round.defaultDay ?? '',
      frequency: round.frequency ?? defaultFrequency,
    })
    setFormSectors(roundSectors[round.id] ?? [])
    setErrors({})
    setSaveError(null)
    formCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  async function saveRound() {
    const name = form.name.trim()
    const next: RoundFormErrors = {}
    if (!form.serviceAreaId) next.serviceAreaId = validation.areaRequired
    if (!name) next.name = validation.nameRequired
    else if (
      rounds.some(
        (round) => round.id !== editingId && round.name?.trim().toLowerCase() === name.toLowerCase(),
      )
    ) {
      next.name = fill(validation.duplicateName, { name })
    }
    if (!form.defaultDay) next.defaultDay = validation.dayRequired
    if (next.serviceAreaId || next.name || next.defaultDay) {
      setErrors(next)
      return
    }

    const input: RoundCreateInput = {
      name,
      serviceAreaId: form.serviceAreaId,
      defaultDay: form.defaultDay as DayOfWeek,
      frequency: form.frequency as CleaningFrequency,
    }

    try {
      if (editingId) {
        await onUpdateRound(editingId, input)
        setRoundSectors((prev) => ({ ...prev, [editingId]: formSectors }))
      } else {
        const id = await onCreateRound(input)
        if (id && formSectors.length > 0) setRoundSectors((prev) => ({ ...prev, [id]: formSectors }))
      }
      setStepError(null)
      resetForm(form.serviceAreaId)
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : String(error))
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (rounds.length === 0) {
      setStepError(validation.roundsRequired)
      return
    }
    setStepError(null)
    onSubmit()
  }

  return (
    <form id="setup-wizard-step-form" onSubmit={handleSubmit} noValidate className="space-y-6">
      <div className="flex items-start gap-4">
        <RoundsIcon />
        <div className="pt-0.5">
          <h2 className="text-xl font-semibold text-foreground sm:text-2xl">{content.heading}</h2>
          <p className="mt-1 text-sm text-muted sm:text-base">{content.subheading}</p>
        </div>
      </div>

      <p className="flex items-start gap-3 rounded-xl border border-primary/25 bg-primary/5 px-4 py-3 text-sm text-foreground sm:text-[15px]">
        <span className="text-primary">
          <InfoIcon />
        </span>
        {fill(content.info, { step: setupStepPosition(PROPERTIES_STEP) + 1 })}
      </p>

      {stepError ? (
        <p role="alert" className="rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          {stepError}
        </p>
      ) : null}

      {savedAreas.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border bg-card px-4 py-8 text-center text-sm text-muted">
          {content.noAreas}
        </p>
      ) : (
        <section ref={formCardRef} className="scroll-mt-6 rounded-2xl border border-border bg-card p-5 sm:p-6">
          <h3 className="mb-5 text-base font-semibold text-foreground sm:text-lg">
            {editingId ? formContent.editTitle : formContent.title}
          </h3>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label={fields.area.label} required labelWeight="medium" error={errors.serviceAreaId}>
              <Select
                aria-invalid={Boolean(errors.serviceAreaId)}
                value={form.serviceAreaId}
                onChange={(event) => chooseArea(event.target.value)}
                options={[
                  { value: '', label: fields.area.placeholder },
                  ...savedAreas.map((area) => ({ value: area.id, label: area.name ?? '' })),
                ]}
              />
            </Field>

            <Field label={fields.name.label} required labelWeight="medium" error={errors.name}>
              <Input
                ref={nameInputRef}
                aria-invalid={Boolean(errors.name)}
                value={form.name}
                onChange={(event) => updateForm('name', event.target.value)}
                onKeyDown={(event) => {
                  if (event.key !== 'Enter') return
                  // Enter would otherwise submit the wizard form and move on.
                  event.preventDefault()
                  void saveRound()
                }}
                placeholder={namePlaceholder}
              />
            </Field>

            <Field label={fields.day.label} required labelWeight="medium" error={errors.defaultDay}>
              <Select
                aria-invalid={Boolean(errors.defaultDay)}
                value={form.defaultDay}
                onChange={(event) => updateForm('defaultDay', event.target.value)}
                options={[{ value: '', label: 'Select a day' }, ...dayOptions]}
              />
              {errors.defaultDay ? null : (
                <p className="mt-2 text-sm text-muted">
                  {fill(fields.day.hint, { step: setupStepPosition(BUSINESS_STEP) + 1 })}
                </p>
              )}
            </Field>

            <Field label={fields.frequency.label} required labelWeight="medium">
              <Select
                value={form.frequency}
                onChange={(event) => updateForm('frequency', event.target.value)}
                options={content.frequencies}
              />
              <p className="mt-2 text-sm text-muted">{fields.frequency.hint}</p>
            </Field>

            <div className="sm:col-span-2">
              <p className="mb-2 text-sm font-medium text-foreground">{fields.sectors.label}</p>
              {!selectedArea ? (
                <p className="text-sm text-muted">{fields.sectors.noArea}</p>
              ) : selectedAreaSectors.length === 0 ? (
                <p className="text-sm text-muted">{fields.sectors.empty}</p>
              ) : (
                <>
                  <div className="flex flex-wrap gap-2">
                    {selectedAreaSectors.map((sector) => (
                      <SectorChip
                        key={sector}
                        sector={sector}
                        selected={formSectors.includes(sector)}
                        onClick={() => toggleSector(sector)}
                      />
                    ))}
                  </div>
                  <p className="mt-2 text-sm text-muted">{fields.sectors.hint}</p>
                </>
              )}
            </div>
          </div>

          {saveError ? <FieldError message={saveError} /> : null}

          <div className="mt-5 flex flex-wrap justify-end gap-2">
            {editingId ? (
              <button
                type="button"
                onClick={() => resetForm(form.serviceAreaId)}
                disabled={saving}
                className="rounded-xl border border-border bg-card px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-surface disabled:opacity-60 sm:text-[15px]"
              >
                {formContent.actions.cancel}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => void saveRound()}
              disabled={saving}
              className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-all duration-200 hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 sm:text-[15px]"
            >
              {editingId ? formContent.actions.save : formContent.actions.add}
            </button>
          </div>
        </section>
      )}

      {savedAreas.map((area) => {
        const areaRounds = rounds.filter((round) => round.serviceAreaId === area.id)
        const sectors = splitSectors(area.postcodeSector)
        return (
          <section key={area.id} className="rounded-2xl border border-border bg-card p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-foreground sm:text-lg">{area.name}</h3>
                <p className="mt-0.5 text-sm text-muted">
                  {sectors.length > 0 ? sectors.join(' · ') : areaCard.noSectors}
                </p>
              </div>
              {form.serviceAreaId !== area.id || editingId ? (
                <button
                  type="button"
                  onClick={() => startRoundFor(area.id)}
                  className="text-sm font-medium text-primary transition-opacity hover:opacity-75 sm:text-[15px]"
                >
                  {fill(areaCard.addRound, { area: area.name ?? '' })}
                </button>
              ) : null}
            </div>

            {areaRounds.length === 0 ? (
              <p className="mt-4 flex items-start gap-3 rounded-xl border border-warning-border bg-warning-surface px-4 py-3 text-sm text-warning-foreground sm:text-[15px]">
                <WarningIcon />
                {fill(areaCard.empty, { area: area.name ?? '' })}
              </p>
            ) : (
              <div className="mt-4 overflow-x-auto rounded-xl border border-border">
                <table className="w-full min-w-[36rem] text-left text-sm sm:text-[15px]">
                  <thead className="bg-foreground/[0.025] text-sm text-muted">
                    <tr>
                      <th scope="col" className="px-5 py-3 font-normal">{areaCard.columns.round}</th>
                      <th scope="col" className="px-5 py-3 font-normal">{areaCard.columns.day}</th>
                      <th scope="col" className="px-5 py-3 font-normal">{areaCard.columns.frequency}</th>
                      <th scope="col" className="px-5 py-3 font-normal">{areaCard.columns.sectors}</th>
                      <th scope="col" className="px-5 py-3"><span className="sr-only">{areaCard.edit}</span></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {areaRounds.map((round) => (
                      <tr key={round.id} className={cn(editingId === round.id && 'bg-primary/5')}>
                        <td className="px-5 py-4 font-medium text-foreground">{round.name}</td>
                        <td className="px-5 py-4 text-foreground">{dayLabel(round.defaultDay)}</td>
                        <td className="px-5 py-4 text-foreground">{frequencyLabel(round.frequency)}</td>
                        <td className="px-5 py-3">
                          <div className="flex flex-wrap gap-1.5">
                            {(roundSectors[round.id ?? ''] ?? []).map((sector) => (
                              <SectorChip key={sector} sector={sector} />
                            ))}
                          </div>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => editRound(round)}
                            className="font-medium text-primary transition-opacity hover:opacity-75"
                          >
                            {areaCard.edit}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )
      })}
    </form>
  )
}
