import type { FormEvent, KeyboardEvent } from 'react'
import { useMemo, useRef, useState } from 'react'
import type { TechnicianCreateInput, TechnicianListItem } from '@/api/technicians.api'
import type { ServiceArea } from '@/api/types'
import { setupWizardContent } from '@/content/setup-wizard'
import { Field, FieldError, Input, PhoneInput, Select } from '@/components/ui'
import { useToast } from '@/components/ui/toast'
import { isValidEmail, isValidPhone } from '@/lib/contact'
import { technicianRoleLabel, toTechnicianRole } from '@/lib/technician-roles'
import { cn } from '@/lib/utils'

interface TechniciansStepProps {
  technicians: TechnicianListItem[]
  areas: ServiceArea[]
  saving: boolean
  /** Resolves with the created technician's id. */
  onCreateTechnician: (input: TechnicianCreateInput) => Promise<string | undefined>
  onUpdateTechnician: (id: string, input: TechnicianCreateInput) => Promise<void>
  onSendInvite: (technician: { id: string; email: string }) => Promise<void>
  onSubmit: () => void
}

interface TechnicianForm {
  fullName: string
  mobile: string
  email: string
  role: string
  areaIds: string[]
  sendInvite: boolean
}

type TechnicianFormErrors = Partial<Record<'fullName' | 'mobile' | 'email' | 'areaIds', string>>

type AppAccess = 'active' | 'invited' | 'notInvited' | 'inactive'

const emptyForm = (): TechnicianForm => ({
  fullName: '',
  mobile: '',
  email: '',
  role: 'STANDARD',
  areaIds: [],
  sendInvite: true,
})

function fill(template: string, values: Record<string, string | number>): string {
  return Object.entries(values).reduce(
    (text, [key, value]) => text.replaceAll(`{${key}}`, String(value)),
    template,
  )
}

function TechniciansIcon() {
  return (
    <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6" aria-hidden="true">
        <circle cx="9" cy="8" r="3.5" />
        <path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.4a6.5 6.5 0 0 1 3.5 5.6" strokeLinecap="round" />
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

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
      <path d="M3.5 8.5l3 3 6-7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function AreaChip({ label, selected, onClick }: { label: string; selected?: boolean; onClick?: () => void }) {
  const className = cn(
    'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors',
    selected ? 'border-primary/25 bg-primary/10 text-foreground' : 'border-border bg-card text-foreground',
  )
  if (!onClick) return <span className={className}>{label}</span>
  return (
    <button type="button" aria-pressed={selected} onClick={onClick} className={cn(className, !selected && 'hover:bg-surface')}>
      {selected ? <CheckIcon className="h-3 w-3" /> : null}
      {label}
    </button>
  )
}

const ACCESS_BADGE_CLASS: Record<AppAccess, string> = {
  active: 'bg-success/10 text-success',
  invited: 'bg-warning-surface text-warning-foreground',
  notInvited: 'bg-foreground/[0.05] text-muted',
  inactive: 'bg-foreground/[0.05] text-muted',
}

export function TechniciansStep({
  technicians,
  areas,
  saving,
  onCreateTechnician,
  onUpdateTechnician,
  onSendInvite,
  onSubmit,
}: TechniciansStepProps) {
  const content = setupWizardContent.technicians
  const { form: formContent, team, appAccess, actions } = content
  const { fields, validation } = formContent
  const { showToast } = useToast()

  const [form, setForm] = useState<TechnicianForm>(emptyForm)
  const [errors, setErrors] = useState<TechnicianFormErrors>({})
  const [saveError, setSaveError] = useState<string | null>(null)
  const [stepError, setStepError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [invitingId, setInvitingId] = useState<string | null>(null)
  // The API can't tell "invite sent" from "never invited" (both PENDING_INVITE) — remember
  // what this session did; otherwise assume a pending technician with an email was invited.
  const [inviteSent, setInviteSent] = useState<Record<string, boolean>>({})
  // CONTRACT-DIFF: /technicians takes a single serviceAreaId — extra areas stay in this step only.
  const [extraAreaIds, setExtraAreaIds] = useState<Record<string, string[]>>({})
  const formCardRef = useRef<HTMLElement>(null)

  const savedAreas = useMemo(
    () => areas.filter((area): area is ServiceArea & { id: string } => Boolean(area.id)),
    [areas],
  )
  const areaName = (id: string) => savedAreas.find((area) => area.id === id)?.name ?? ''
  const roleLabel = (role: string | null) => (role ? technicianRoleLabel(role) : '—')

  function technicianAreaIds(technician: TechnicianListItem): string[] {
    const ids = technician.serviceAreas.map((assignment) => assignment.serviceAreaId)
    return [...new Set([...ids, ...(extraAreaIds[technician.id] ?? [])])]
  }

  function accessOf(technician: TechnicianListItem): AppAccess {
    if (technician.appStatus === 'ACTIVE') return 'active'
    if (technician.appStatus === 'INACTIVE') return 'inactive'
    return (inviteSent[technician.id] ?? Boolean(technician.email)) ? 'invited' : 'notInvited'
  }

  function updateForm<K extends keyof TechnicianForm>(key: K, value: TechnicianForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => (prev[key as keyof TechnicianFormErrors] ? { ...prev, [key]: undefined } : prev))
    setSaveError(null)
  }

  function toggleArea(id: string) {
    updateForm(
      'areaIds',
      form.areaIds.includes(id) ? form.areaIds.filter((item) => item !== id) : [...form.areaIds, id],
    )
  }

  function resetForm() {
    setForm(emptyForm())
    setErrors({})
    setSaveError(null)
    setEditingId(null)
  }

  function editTechnician(technician: TechnicianListItem) {
    setEditingId(technician.id)
    setForm({
      fullName: technician.name ?? '',
      mobile: technician.phone ?? '',
      email: technician.email ?? '',
      role: toTechnicianRole(technician.role) ?? 'STANDARD',
      areaIds: technicianAreaIds(technician),
      sendInvite: false,
    })
    setErrors({})
    setSaveError(null)
    formCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  async function saveTechnician() {
    const fullName = form.fullName.trim()
    const mobile = form.mobile.trim()
    const email = form.email.trim()

    const next: TechnicianFormErrors = {}
    if (!fullName) next.fullName = validation.nameRequired
    if (!mobile) next.mobile = validation.mobileRequired
    else if (!isValidPhone(mobile)) next.mobile = validation.mobileInvalid
    if (!email) next.email = validation.emailRequired
    else if (!isValidEmail(email)) next.email = validation.emailInvalid
    if (savedAreas.length > 0 && form.areaIds.length === 0) next.areaIds = validation.areasRequired
    if (Object.values(next).some(Boolean)) {
      setErrors(next)
      return
    }

    const [primaryAreaId, ...otherAreaIds] = form.areaIds
    const input: TechnicianCreateInput = {
      name: fullName,
      phone: mobile,
      email,
      role: form.role,
      serviceAreaId: primaryAreaId ?? null,
    }

    try {
      let id = editingId
      if (editingId) {
        await onUpdateTechnician(editingId, input)
      } else {
        id = (await onCreateTechnician({ ...input, sendInvite: form.sendInvite })) ?? null
        if (id) setInviteSent((prev) => ({ ...prev, [id as string]: form.sendInvite }))
      }
      if (id) setExtraAreaIds((prev) => ({ ...prev, [id as string]: otherAreaIds }))
      setStepError(null)
      resetForm()
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : String(error))
    }
  }

  async function sendInvite(technician: TechnicianListItem) {
    const email = technician.email?.trim()
    if (!email) {
      showToast(content.toasts.addEmailFirst)
      editTechnician(technician)
      return
    }
    setInvitingId(technician.id)
    try {
      await onSendInvite({ id: technician.id, email })
      setInviteSent((prev) => ({ ...prev, [technician.id]: true }))
      showToast(fill(content.toasts.inviteSent, { email }))
    } catch (error) {
      showToast(error instanceof Error ? error.message : String(error))
    } finally {
      setInvitingId(null)
    }
  }

  /** Enter in a text box saves the technician instead of submitting the wizard. */
  function handleFieldKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'Enter') return
    event.preventDefault()
    void saveTechnician()
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (technicians.length === 0) {
      setStepError(content.team.empty)
      return
    }
    setStepError(null)
    onSubmit()
  }

  return (
    <form id="setup-wizard-step-form" onSubmit={handleSubmit} noValidate className="space-y-6">
      <div className="flex items-start gap-4">
        <TechniciansIcon />
        <div className="pt-0.5">
          <h2 className="text-xl font-semibold text-foreground sm:text-2xl">{content.heading}</h2>
          <p className="mt-1 text-sm text-muted sm:text-base">{content.subheading}</p>
        </div>
      </div>

      <p className="flex items-start gap-3 rounded-xl border border-primary/25 bg-primary/5 px-4 py-3 text-sm text-foreground sm:text-[15px]">
        <span className="text-primary">
          <InfoIcon />
        </span>
        {content.info}
      </p>

      {stepError ? (
        <p role="alert" className="rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          {stepError}
        </p>
      ) : null}

      <section ref={formCardRef} className="scroll-mt-6 rounded-2xl border border-border bg-card p-5 sm:p-6">
        <h3 className="mb-5 text-base font-semibold text-foreground sm:text-lg">
          {editingId ? formContent.editTitle : formContent.title}
        </h3>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label={fields.fullName.label} required labelWeight="medium" error={errors.fullName}>
            <Input
              aria-invalid={Boolean(errors.fullName)}
              value={form.fullName}
              onChange={(event) => updateForm('fullName', event.target.value)}
              onKeyDown={handleFieldKeyDown}
              placeholder={fields.fullName.placeholder}
              autoComplete="off"
            />
          </Field>

          <Field label={fields.mobile.label} required labelWeight="medium" error={errors.mobile}>
            <PhoneInput
              aria-invalid={Boolean(errors.mobile)}
              value={form.mobile}
              onValueChange={(mobile) => updateForm('mobile', mobile)}
              onKeyDown={handleFieldKeyDown}
              placeholder={fields.mobile.placeholder}
            />
          </Field>

          <Field label={fields.email.label} required labelWeight="medium" error={errors.email}>
            <Input
              type="email"
              aria-invalid={Boolean(errors.email)}
              value={form.email}
              onChange={(event) => updateForm('email', event.target.value)}
              onKeyDown={handleFieldKeyDown}
              placeholder={fields.email.placeholder}
              autoComplete="off"
            />
            {errors.email ? null : <p className="mt-2 text-sm text-muted">{fields.email.hint}</p>}
          </Field>

          <Field label={fields.role.label} labelWeight="medium">
            <Select
              value={form.role}
              onChange={(event) => updateForm('role', event.target.value)}
              options={content.roles}
            />
            <p className="mt-2 text-sm text-muted">{fields.role.hint}</p>
          </Field>

          <div className="sm:col-span-2">
            <p className="mb-2 text-sm font-medium text-foreground">
              {fields.areas.label}
              <span className="text-danger"> *</span>
            </p>
            {savedAreas.length === 0 ? (
              <p className="text-sm text-muted">{fields.areas.empty}</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {savedAreas.map((area) => (
                  <AreaChip
                    key={area.id}
                    label={area.name ?? ''}
                    selected={form.areaIds.includes(area.id)}
                    onClick={() => toggleArea(area.id)}
                  />
                ))}
              </div>
            )}
            {errors.areaIds ? (
              <FieldError message={errors.areaIds} />
            ) : (
              <p className="mt-2 text-sm text-muted">{fields.areas.hint}</p>
            )}
          </div>
        </div>

        {saveError ? <FieldError message={saveError} /> : null}

        <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
          {editingId ? (
            <span />
          ) : (
            <label className="flex cursor-pointer items-center gap-3 text-sm text-foreground sm:text-[15px]">
              <input
                type="checkbox"
                checked={form.sendInvite}
                onChange={(event) => updateForm('sendInvite', event.target.checked)}
                className="h-5 w-5 rounded border-border accent-primary"
              />
              {fields.sendInvite.label}
            </label>
          )}

          <div className="flex flex-wrap gap-2">
            {editingId ? (
              <button
                type="button"
                onClick={resetForm}
                disabled={saving}
                className="rounded-xl border border-border bg-card px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-surface disabled:opacity-60 sm:text-[15px]"
              >
                {formContent.actions.cancel}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => void saveTechnician()}
              disabled={saving}
              className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-all duration-200 hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 sm:text-[15px]"
            >
              {editingId ? formContent.actions.save : formContent.actions.add}
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <h3 className="mb-5 text-base font-semibold text-foreground sm:text-lg">
          {fill(team.heading, { count: technicians.length })}
        </h3>

        {technicians.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted">
            {team.empty}
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-[46rem] text-left text-sm sm:text-[15px]">
              <thead className="bg-foreground/[0.025] text-sm text-muted">
                <tr>
                  <th scope="col" className="px-5 py-3 font-normal">{team.columns.name}</th>
                  <th scope="col" className="px-5 py-3 font-normal">{team.columns.mobile}</th>
                  <th scope="col" className="px-5 py-3 font-normal">{team.columns.areas}</th>
                  <th scope="col" className="px-5 py-3 font-normal">{team.columns.role}</th>
                  <th scope="col" className="px-5 py-3 font-normal">{team.columns.appAccess}</th>
                  <th scope="col" className="px-5 py-3"><span className="sr-only">{actions.edit}</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {technicians.map((technician) => {
                  const access = accessOf(technician)
                  const inviteLabel = access === 'invited' ? actions.resend : actions.sendInvite
                  return (
                    <tr key={technician.id} className={cn(editingId === technician.id && 'bg-primary/5')}>
                      <td className="px-5 py-4 font-medium text-foreground">{technician.name || '—'}</td>
                      <td className="px-5 py-4 whitespace-nowrap text-foreground">{technician.phone || '—'}</td>
                      <td className="px-5 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          {technicianAreaIds(technician).map((id) => (
                            <AreaChip key={id} label={areaName(id)} />
                          ))}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-foreground">{roleLabel(technician.role)}</td>
                      <td className="px-5 py-4">
                        <span className={cn('inline-flex rounded-full px-3 py-1 text-sm whitespace-nowrap', ACCESS_BADGE_CLASS[access])}>
                          {appAccess[access]}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-4 whitespace-nowrap">
                          {access === 'invited' || access === 'notInvited' ? (
                            <button
                              type="button"
                              onClick={() => void sendInvite(technician)}
                              disabled={invitingId === technician.id}
                              className="font-medium text-primary transition-opacity hover:opacity-75 disabled:opacity-60"
                            >
                              {invitingId === technician.id ? actions.sending : inviteLabel}
                            </button>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => editTechnician(technician)}
                            className="font-medium text-primary transition-opacity hover:opacity-75"
                          >
                            {actions.edit}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </form>
  )
}
