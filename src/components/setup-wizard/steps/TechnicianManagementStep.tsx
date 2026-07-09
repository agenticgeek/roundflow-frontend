import type { FormEvent } from 'react'
import { useMemo, useState } from 'react'
import type { Technician, TechnicianManagementData } from '@/types/setup-wizard'
import { setupWizardContent } from '@/content/setup-wizard'
import { Field, FieldError, Input, Select } from '@/components/ui'
import { cn } from '@/lib/utils'

interface TechnicianManagementStepProps {
  initialValues: TechnicianManagementData
  onSubmit: (values: TechnicianManagementData) => void
}

interface NewTechnicianForm {
  fullName: string
  mobile: string
  email: string
  role: string
  defaultArea: string
}

const emptyForm = (): NewTechnicianForm => ({
  fullName: '',
  mobile: '',
  email: '',
  role: '',
  defaultArea: '',
})

function TechnicianManagementIcon() {
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true">
        <path
          d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9.5 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM19 8v6M22 11h-6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  )
}

function AppStatusBadge({
  status,
  label,
}: {
  status: Technician['appStatus']
  label: string
}) {
  return (
    <span
      className={cn(
        'inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium',
        status === 'active' && 'bg-success/10 text-success',
        status === 'inactive' && 'bg-surface text-muted',
        status === 'pending' && 'bg-primary/10 text-primary',
      )}
    >
      {label}
    </span>
  )
}

function MoreOptionsIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5" aria-hidden="true">
      <path d="M10 3a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM10 8.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM10 14a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Z" />
    </svg>
  )
}

export function TechnicianManagementStep({ initialValues, onSubmit }: TechnicianManagementStepProps) {
  const { technicianManagement } = setupWizardContent
  const { addForm, columns, appStatusLabels, roleOptions, actions } = technicianManagement

  const [technicians, setTechnicians] = useState<Technician[]>(initialValues.technicians)
  const [showAddForm, setShowAddForm] = useState(false)
  const [form, setForm] = useState<NewTechnicianForm>(emptyForm)
  const [formError, setFormError] = useState<string | null>(null)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)

  const roleLabels = useMemo(
    () => Object.fromEntries(roleOptions.filter((o) => o.value).map((o) => [o.value, o.label])),
    [roleOptions],
  )

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSubmit({ technicians })
  }

  function openForm() {
    setShowAddForm(true)
    setForm(emptyForm())
    setFormError(null)
  }

  function closeForm() {
    setShowAddForm(false)
    setForm(emptyForm())
    setFormError(null)
  }

  function addTechnician() {
    const fullName = form.fullName.trim()
    const mobile = form.mobile.trim()

    if (!fullName) {
      setFormError(addForm.validation.nameRequired)
      return
    }
    if (!mobile) {
      setFormError(addForm.validation.mobileRequired)
      return
    }

    setTechnicians((prev) => [
      ...prev,
      {
        id: `tech-${Date.now()}`,
        fullName,
        mobile,
        email: form.email.trim(),
        role: form.role,
        defaultArea: form.defaultArea.trim(),
        appStatus: 'active',
      },
    ])

    closeForm()
  }

  function deleteTechnician(id: string) {
    setTechnicians((prev) => prev.filter((technician) => technician.id !== id))
    setOpenMenuId(null)
  }

  return (
    <form id="setup-wizard-step-form" onSubmit={handleSubmit} noValidate className="space-y-5">
      <div className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <TechnicianManagementIcon />
          <div>
            <h2 className="text-lg font-medium text-foreground sm:text-xl">
              {technicianManagement.heading}
            </h2>
            <p className="mt-1 text-sm text-muted">{technicianManagement.subheading}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={openForm}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-all duration-200 hover:opacity-90 active:scale-[0.98]"
        >
          <span aria-hidden="true">+</span>
          {technicianManagement.addTechnician}
        </button>
      </div>

      {showAddForm ? (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 sm:p-5">
          <h3 className="text-sm font-medium text-foreground">{addForm.title}</h3>

          <div className="mt-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={addForm.fields.fullName.label} required labelWeight="medium" size="sm">
                <Input
                  inputSize="sm"
                  value={form.fullName}
                  onChange={(event) => {
                    setForm((prev) => ({ ...prev, fullName: event.target.value }))
                    if (formError) setFormError(null)
                  }}
                  placeholder={addForm.fields.fullName.placeholder}
                  autoFocus
                />
              </Field>

              <Field label={addForm.fields.mobile.label} required labelWeight="medium" size="sm">
                <Input
                  inputSize="sm"
                  type="tel"
                  value={form.mobile}
                  onChange={(event) => {
                    setForm((prev) => ({ ...prev, mobile: event.target.value }))
                    if (formError) setFormError(null)
                  }}
                  placeholder={addForm.fields.mobile.placeholder}
                />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={addForm.fields.email.label} labelWeight="medium" size="sm">
                <Input
                  inputSize="sm"
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                  placeholder={addForm.fields.email.placeholder}
                />
              </Field>

              <Field
                label={
                  <>
                    {addForm.fields.role.label}{' '}
                    <span className="font-normal text-muted">{addForm.fields.role.optional}</span>
                  </>
                }
                labelWeight="medium"
                size="sm"
              >
                <Select
                  inputSize="sm"
                  value={form.role}
                  onChange={(event) => setForm((prev) => ({ ...prev, role: event.target.value }))}
                  options={[...roleOptions]}
                />
              </Field>
            </div>

            <Field label={addForm.fields.defaultArea.label} labelWeight="medium" size="sm">
              <Input
                inputSize="sm"
                value={form.defaultArea}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, defaultArea: event.target.value }))
                }
                placeholder={addForm.fields.defaultArea.placeholder}
              />
            </Field>

            {formError ? <FieldError message={formError} size="sm" /> : null}

            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={addTechnician}
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

      <div className="overflow-hidden rounded-xl border border-border">
        <div className="hidden grid-cols-[1.4fr_1fr_1fr_0.9fr_0.9fr_3rem] gap-4 border-b border-border bg-surface px-4 py-2.5 text-xs font-medium tracking-wide text-muted uppercase sm:grid">
          <span>{columns.name}</span>
          <span>{columns.phone}</span>
          <span>{columns.role}</span>
          <span>{columns.round}</span>
          <span>{columns.appStatus}</span>
          <span className="sr-only">{columns.actions}</span>
        </div>

        <ul className="divide-y divide-border">
          {technicians.map((technician) => (
            <li
              key={technician.id}
              className="grid gap-3 px-4 py-3 sm:grid-cols-[1.4fr_1fr_1fr_0.9fr_0.9fr_3rem] sm:items-center sm:gap-4"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">{technician.fullName}</p>
                {technician.email ? (
                  <p className="mt-0.5 truncate text-xs text-muted">{technician.email}</p>
                ) : null}
              </div>

              <p className="text-sm text-foreground sm:text-left">{technician.mobile}</p>

              <p className="text-sm text-foreground">
                {technician.role ? (roleLabels[technician.role] ?? technician.role) : '—'}
              </p>

              <p className="text-sm text-foreground">{technician.defaultArea || '—'}</p>

              <div>
                <AppStatusBadge
                  status={technician.appStatus}
                  label={appStatusLabels[technician.appStatus]}
                />
              </div>

              <div className="relative flex justify-end">
                <button
                  type="button"
                  aria-label={actions.moreOptions}
                  onClick={() =>
                    setOpenMenuId((current) => (current === technician.id ? null : technician.id))
                  }
                  className="rounded-lg p-1.5 text-muted transition-colors hover:bg-surface hover:text-foreground"
                >
                  <MoreOptionsIcon />
                </button>

                {openMenuId === technician.id ? (
                  <div className="absolute top-full right-0 z-10 mt-1 min-w-[7rem] rounded-lg border border-border bg-background py-1 shadow-lg">
                    <button
                      type="button"
                      onClick={() => deleteTechnician(technician.id)}
                      className="w-full px-3 py-1.5 text-left text-sm text-danger transition-colors hover:bg-surface"
                    >
                      {actions.delete}
                    </button>
                  </div>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </form>
  )
}
