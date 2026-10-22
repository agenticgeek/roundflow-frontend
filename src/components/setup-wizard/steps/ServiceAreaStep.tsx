import type { FormEvent, KeyboardEvent } from 'react'
import { useEffect, useRef, useState } from 'react'
import type { ServiceArea, ServiceAreaData } from '@/types/setup-wizard'
import { setupWizardContent } from '@/content/setup-wizard'
import { setupStepPosition } from '@/config/setup-wizard'
import { Field, Input } from '@/components/ui'
import { isValidAreaSector, normalizeAreaSector } from '@/lib/postcode'
import { useReportWizardDirty } from '@/features/setup/lib/wizard-dirty'
import { cn } from '@/lib/utils'

interface ServiceAreaStepProps {
  initialValues: ServiceAreaData
  onSubmit: (values: ServiceAreaData) => void
}

interface AreaForm {
  name: string
  sectors: string[]
  /** Text typed into the sector box but not yet turned into a chip. */
  sectorDraft: string
  notes: string
}

type AreaFormErrors = Partial<Record<'name' | 'sectors', string>>

/** Backend step number of "Rounds" — the area list points users there. */
const ROUNDS_STEP = 8

const emptyForm = (): AreaForm => ({ name: '', sectors: [], sectorDraft: '', notes: '' })

function fill(template: string, values: Record<string, string | number>): string {
  return Object.entries(values).reduce(
    (text, [key, value]) => text.replaceAll(`{${key}}`, String(value)),
    template,
  )
}

function ServiceAreaIcon() {
  return (
    <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6" aria-hidden="true">
        <path
          d="M12 21s7-4.5 7-11a7 7 0 1 0-14 0c0 6.5 7 11 7 11Z"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="12" cy="10" r="2.5" strokeLinecap="round" strokeLinejoin="round" />
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

function SectorChip({ sector, onRemove, removeLabel }: { sector: string; onRemove?: () => void; removeLabel?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-sm text-foreground">
      {sector}
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          aria-label={removeLabel}
          className="-mr-1 rounded-full p-0.5 text-foreground/70 transition-colors hover:bg-primary/15 hover:text-foreground"
        >
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" className="h-3 w-3" aria-hidden="true">
            <path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round" />
          </svg>
        </button>
      ) : null}
    </span>
  )
}

export function ServiceAreaStep({ initialValues, onSubmit }: ServiceAreaStepProps) {
  const { serviceArea } = setupWizardContent
  const { addForm, list, actions } = serviceArea
  const roundsStepNumber = setupStepPosition(ROUNDS_STEP) + 1

  const [areas, setAreas] = useState<ServiceArea[]>(initialValues.areas)
  useReportWizardDirty({ areas }, initialValues)
  const [form, setForm] = useState<AreaForm>(emptyForm)
  const [formErrors, setFormErrors] = useState<AreaFormErrors>({})
  const [editingId, setEditingId] = useState<string | null>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)
  const sectorInputRef = useRef<HTMLInputElement>(null)

  // Resync when the parent refetches (e.g. after a failed save rolls back a
  // locally-deleted area that's still referenced server-side) — a deleted area
  // otherwise vanishes from view with no way back until you leave and return.
  useEffect(() => {
    setAreas(initialValues.areas)
  }, [initialValues])

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSubmit({ areas })
  }

  function resetForm() {
    setForm(emptyForm())
    setFormErrors({})
    setEditingId(null)
  }

  /** Sector already used by another area — one sector can only belong to one area. */
  function areaOwning(sector: string): ServiceArea | undefined {
    return areas.find((area) => area.id !== editingId && area.postcodeSectors.includes(sector))
  }

  /** Validates a typed sector; returns the error message, or null when it's fine. */
  function sectorError(sector: string): string | null {
    if (!isValidAreaSector(sector)) return fill(addForm.validation.postcodeInvalid, { sector })
    const owner = areaOwning(sector)
    if (owner) return fill(addForm.validation.sectorTaken, { sector, area: owner.name })
    return null
  }

  /** Turns the typed text into a chip. Returns the sectors list including it, or null if invalid. */
  function commitSectorDraft(): string[] | null {
    const sector = normalizeAreaSector(form.sectorDraft.replace(/,/g, ''))
    if (!sector) return form.sectors
    const error = sectorError(sector)
    if (error) {
      setFormErrors((prev) => ({ ...prev, sectors: error }))
      return null
    }
    const sectors = form.sectors.includes(sector) ? form.sectors : [...form.sectors, sector]
    setForm((prev) => ({ ...prev, sectors, sectorDraft: '' }))
    setFormErrors((prev) => ({ ...prev, sectors: undefined }))
    return sectors
  }

  function removeSector(sector: string) {
    setForm((prev) => ({ ...prev, sectors: prev.sectors.filter((item) => item !== sector) }))
  }

  function handleSectorKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter' || event.key === ',') {
      // Enter would otherwise submit the wizard form and move to the next step.
      event.preventDefault()
      commitSectorDraft()
    } else if (event.key === 'Backspace' && !form.sectorDraft && form.sectors.length > 0) {
      removeSector(form.sectors[form.sectors.length - 1])
    }
  }

  /** Enter in the name/notes boxes saves the area instead of submitting the wizard. */
  function handleFieldKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'Enter') return
    event.preventDefault()
    saveArea()
  }

  function saveArea() {
    const name = form.name.trim()
    const sectors = commitSectorDraft()
    if (sectors === null) return

    const errors: AreaFormErrors = {}
    if (!name) errors.name = addForm.validation.nameRequired
    if (sectors.length === 0) errors.sectors = addForm.validation.postcodeRequired
    if (errors.name || errors.sectors) {
      setFormErrors(errors)
      if (errors.name) nameInputRef.current?.focus()
      else sectorInputRef.current?.focus()
      return
    }

    const notes = form.notes.trim()
    if (editingId) {
      setAreas((prev) =>
        prev.map((area) =>
          area.id === editingId ? { ...area, name, postcodeSectors: sectors, notes } : area,
        ),
      )
    } else {
      setAreas((prev) => [
        ...prev,
        { id: `area-${Date.now()}`, name, postcodeSectors: sectors, notes, roundCount: 0 },
      ])
    }
    resetForm()
  }

  function editArea(area: ServiceArea) {
    setEditingId(area.id)
    setForm({ name: area.name, sectors: area.postcodeSectors, sectorDraft: '', notes: area.notes })
    setFormErrors({})
    nameInputRef.current?.focus()
    nameInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  function deleteArea(id: string) {
    setAreas((prev) => prev.filter((area) => area.id !== id))
    if (editingId === id) resetForm()
  }

  function roundsLabel(count: number): string {
    if (count === 0) return fill(list.noRounds, { step: roundsStepNumber })
    if (count === 1) return list.roundsOne
    return fill(list.roundsMany, { count })
  }

  return (
    <form id="setup-wizard-step-form" onSubmit={handleSubmit} noValidate className="space-y-6">
      <div className="flex items-start gap-4">
        <ServiceAreaIcon />
        <div className="pt-0.5">
          <h2 className="text-xl font-semibold text-foreground sm:text-2xl">{serviceArea.heading}</h2>
          <p className="mt-1 text-sm text-muted sm:text-base">{serviceArea.subheading}</p>
        </div>
      </div>

      <p className="flex items-start gap-3 rounded-xl border border-primary/25 bg-primary/5 px-4 py-3 text-sm text-foreground sm:text-[15px]">
        <span className="text-primary">
          <InfoIcon />
        </span>
        {serviceArea.info}
      </p>

      <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <h3 className="mb-5 text-base font-semibold text-foreground sm:text-lg">
          {editingId ? addForm.editTitle : addForm.title}
        </h3>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label={addForm.fields.areaName.label} required labelWeight="medium" error={formErrors.name}>
            <Input
              ref={nameInputRef}
              value={form.name}
              aria-invalid={Boolean(formErrors.name)}
              onChange={(event) => {
                setForm((prev) => ({ ...prev, name: event.target.value }))
                setFormErrors((prev) => ({ ...prev, name: undefined }))
              }}
              onKeyDown={handleFieldKeyDown}
              placeholder={addForm.fields.areaName.placeholder}
            />
          </Field>

          <Field label={addForm.fields.postcodeSectors.label} required labelWeight="medium" error={formErrors.sectors}>
            <div
              onClick={() => sectorInputRef.current?.focus()}
              className={cn(
                'flex min-h-[3.125rem] w-full cursor-text flex-wrap items-center gap-2 rounded-xl border bg-background px-3 py-2 transition-[border-color,box-shadow] duration-200 focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10',
                formErrors.sectors ? 'border-danger' : 'border-border',
              )}
            >
              {form.sectors.map((sector) => (
                <SectorChip
                  key={sector}
                  sector={sector}
                  onRemove={() => removeSector(sector)}
                  removeLabel={fill(addForm.fields.postcodeSectors.remove, { sector })}
                />
              ))}
              <input
                ref={sectorInputRef}
                value={form.sectorDraft}
                aria-label={addForm.fields.postcodeSectors.label}
                aria-invalid={Boolean(formErrors.sectors)}
                onChange={(event) => {
                  setForm((prev) => ({ ...prev, sectorDraft: event.target.value.toUpperCase() }))
                  setFormErrors((prev) => ({ ...prev, sectors: undefined }))
                }}
                onKeyDown={handleSectorKeyDown}
                onBlur={() => form.sectorDraft.trim() && commitSectorDraft()}
                placeholder={addForm.fields.postcodeSectors.placeholder}
                className="min-w-[10rem] flex-1 bg-transparent px-1 py-1 text-[15px] text-foreground outline-none placeholder:text-muted"
              />
            </div>
            <p className="mt-2 text-sm text-muted">{addForm.fields.postcodeSectors.hint}</p>
          </Field>

          <Field label={addForm.fields.notes.label} labelWeight="medium" className="sm:col-span-2">
            <Input
              value={form.notes}
              onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
              onKeyDown={handleFieldKeyDown}
              placeholder={addForm.fields.notes.placeholder}
            />
          </Field>
        </div>

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          {editingId ? (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-xl border border-border bg-card px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-surface sm:text-[15px]"
            >
              {addForm.actions.cancel}
            </button>
          ) : null}
          <button
            type="button"
            onClick={saveArea}
            className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-all duration-200 hover:opacity-90 active:scale-[0.98] sm:text-[15px]"
          >
            {editingId ? addForm.actions.save : addForm.actions.confirm}
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <h3 className="mb-5 text-base font-semibold text-foreground sm:text-lg">
          {fill(list.heading, { count: areas.length })}
        </h3>

        {areas.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted">
            {serviceArea.empty}
          </p>
        ) : (
          <ul className="space-y-4">
            {areas.map((area) => (
              <li
                key={area.id}
                className={cn(
                  'flex flex-col gap-3 rounded-xl border bg-foreground/[0.02] px-5 py-4 sm:flex-row sm:items-center sm:justify-between',
                  editingId === area.id ? 'border-primary/40' : 'border-border',
                )}
              >
                <div className="min-w-0">
                  <p className="text-base font-semibold text-foreground">{area.name}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {area.postcodeSectors.map((sector) => (
                      <SectorChip key={sector} sector={sector} />
                    ))}
                  </div>
                  {area.notes ? <p className="mt-2 text-sm text-muted">{area.notes}</p> : null}
                </div>

                <div className="flex shrink-0 items-center gap-5 text-sm sm:text-[15px]">
                  <span className="text-muted">{roundsLabel(area.roundCount)}</span>
                  <button
                    type="button"
                    onClick={() => editArea(area)}
                    className="font-medium text-primary transition-opacity hover:opacity-75"
                  >
                    {actions.edit}
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteArea(area.id)}
                    className="font-medium text-danger transition-opacity hover:opacity-75"
                  >
                    {actions.delete}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </form>
  )
}
