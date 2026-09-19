import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'
import type { ServiceArea, ServiceAreaData } from '@/types/setup-wizard'
import { setupWizardContent } from '@/content/setup-wizard'
import { Field, Input } from '@/components/ui'
import { isValidPostcodeSector } from '@/lib/postcode'
import { useReportWizardDirty } from '@/features/setup/lib/wizard-dirty'

interface ServiceAreaStepProps {
  initialValues: ServiceAreaData
  onSubmit: (values: ServiceAreaData) => void
}

interface NewAreaForm {
  name: string
  postcodeSectors: string
}

type AreaFormErrors = Partial<Record<keyof NewAreaForm, string>>

const emptyForm = (): NewAreaForm => ({
  name: '',
  postcodeSectors: '',
})

function ServiceAreaIcon() {
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true">
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

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden="true">
      <path
        d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m2 0v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V7h12Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M10 11v6M14 11v6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function parsePostcodeSectors(value: string): string[] {
  return value
    .split(/[,;]/)
    .map((sector) => sector.trim().toUpperCase())
    .filter(Boolean)
}

export function ServiceAreaStep({ initialValues, onSubmit }: ServiceAreaStepProps) {
  const { serviceArea } = setupWizardContent
  const { addForm, actions } = serviceArea

  const [areas, setAreas] = useState<ServiceArea[]>(initialValues.areas)
  useReportWizardDirty({ areas }, initialValues)
  const [showAddForm, setShowAddForm] = useState(false)
  const [form, setForm] = useState<NewAreaForm>(emptyForm)
  const [formErrors, setFormErrors] = useState<AreaFormErrors>({})

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

  function openForm() {
    setShowAddForm(true)
    setForm(emptyForm())
    setFormErrors({})
  }

  function closeForm() {
    setShowAddForm(false)
    setForm(emptyForm())
    setFormErrors({})
  }

  function updateForm(key: keyof NewAreaForm, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))
    setFormErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev))
  }

  function addArea() {
    const name = form.name.trim()
    const postcodeSectors = parsePostcodeSectors(form.postcodeSectors)

    const errors: AreaFormErrors = {}
    if (!name) errors.name = addForm.validation.nameRequired
    if (postcodeSectors.length === 0) errors.postcodeSectors = addForm.validation.postcodeRequired
    else if (postcodeSectors.some((sector) => !isValidPostcodeSector(sector))) {
      errors.postcodeSectors = addForm.validation.postcodeInvalid
    }
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      return
    }

    setAreas((prev) => [
      ...prev,
      {
        id: `area-${Date.now()}`,
        name,
        postcodeSectors,
        notes: '',
      },
    ])

    closeForm()
  }

  function deleteArea(id: string) {
    setAreas((prev) => prev.filter((area) => area.id !== id))
  }

  return (
    <form id="setup-wizard-step-form" onSubmit={handleSubmit} noValidate className="space-y-5">
      <div className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <ServiceAreaIcon />
          <div>
            <h2 className="text-lg font-medium text-foreground sm:text-xl">{serviceArea.heading}</h2>
            <p className="mt-1 text-sm text-muted">{serviceArea.subheading}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={openForm}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-all duration-200 hover:opacity-90 active:scale-[0.98]"
        >
          <span aria-hidden="true">+</span>
          {serviceArea.addArea}
        </button>
      </div>

      {showAddForm ? (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 sm:p-5">
          <h3 className="text-sm font-medium text-foreground">{addForm.title}</h3>

          <div className="mt-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label={addForm.fields.areaName.label}
                required
                labelWeight="medium"
                size="sm"
                error={formErrors.name}
              >
                <Input
                  inputSize="sm"
                  value={form.name}
                  aria-invalid={Boolean(formErrors.name)}
                  onChange={(event) => updateForm('name', event.target.value)}
                  placeholder={addForm.fields.areaName.placeholder}
                  autoFocus
                />
              </Field>

              <Field
                label={addForm.fields.postcodeSectors.label}
                required
                labelWeight="medium"
                size="sm"
                error={formErrors.postcodeSectors}
              >
                <Input
                  inputSize="sm"
                  value={form.postcodeSectors}
                  aria-invalid={Boolean(formErrors.postcodeSectors)}
                  onChange={(event) => updateForm('postcodeSectors', event.target.value)}
                  placeholder={addForm.fields.postcodeSectors.placeholder}
                />
                <p className="mt-1.5 text-xs text-muted">{addForm.fields.postcodeSectors.hint}</p>
              </Field>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={addArea}
                className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-all duration-200 hover:opacity-90 active:scale-[0.98]"
              >
                {addForm.actions.confirm}
              </button>
              <button
                type="button"
                onClick={closeForm}
                className="rounded-xl border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-surface"
              >
                {addForm.actions.cancel}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {areas.length === 0 && !showAddForm ? (
        <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted">
          {serviceArea.empty}
        </p>
      ) : null}

      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {areas.map((area) => (
          <li
            key={area.id}
            className="rounded-lg border border-border bg-background p-3 shadow-sm"
          >
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-sm font-medium text-foreground">{area.name}</h3>
              <button
                type="button"
                onClick={() => deleteArea(area.id)}
                aria-label={actions.delete}
                className="-mt-0.5 -mr-0.5 shrink-0 rounded-md p-1 text-muted transition-colors hover:bg-surface hover:text-danger"
              >
                <TrashIcon />
              </button>
            </div>

            <div className="mt-1.5 flex flex-wrap gap-1">
              {area.postcodeSectors.map((sector) => (
                <span
                  key={sector}
                  className="rounded border border-border bg-surface px-1.5 py-px text-[10px] font-medium tracking-wide text-muted uppercase"
                >
                  {sector}
                </span>
              ))}
            </div>

            {area.notes ? (
              <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-muted">{area.notes}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </form>
  )
}
