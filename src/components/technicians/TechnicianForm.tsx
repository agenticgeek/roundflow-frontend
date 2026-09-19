import type { FormEvent } from 'react'
import { useEffect, useMemo, useState } from 'react'
import type { TechnicianRecord } from '@/content/technicians'
import { techniciansContent } from '@/content/technicians'
import type { TechnicianCreateInput, TechnicianUpdateInput } from '@/api/technicians.api'
import { Field, Input, PhoneInput, Select, Textarea, Toggle } from '@/components/ui'
import { DashboardIcon } from '@/components/dashboard/DashboardIcon'
import { useServiceAreas } from '@/features/settings/hooks/useSettings'
import { settingsServiceAreasToRows } from '@/features/settings/lib/mappers'
import { isValidEmail, isValidPhone } from '@/lib/contact'

export type TechnicianFormValues = {
  name: string
  phone: string
  email: string
  role: string
  serviceAreaId: string | null
  notes: string
  sendInvite: boolean
  active: boolean
}

interface TechnicianFormProps {
  mode: 'add' | 'edit'
  technician?: TechnicianRecord
  pending?: boolean
  canMutate?: boolean
  onCancel: () => void
  onSave: (values: TechnicianFormValues) => Promise<void> | void
  onRemove: () => void
  onResendInvite?: () => Promise<void> | void
  resendPending?: boolean
}

/** Add/edit technician form — POST/PATCH /technicians. */
export function TechnicianForm({
  mode,
  technician,
  pending = false,
  canMutate = true,
  onCancel,
  onSave,
  onRemove,
  onResendInvite,
  resendPending = false,
}: TechnicianFormProps) {
  const content = techniciansContent.form
  const editing = mode === 'edit'
  const areasQuery = useServiceAreas()
  const areaOptions = useMemo(() => {
    const rows = settingsServiceAreasToRows(areasQuery.data)
    return [
      { value: '', label: 'Select area...' },
      ...rows.map((area) => ({ value: area.id, label: area.name })),
    ]
  }, [areasQuery.data])

  const [name, setName] = useState(technician?.name ?? '')
  const [phone, setPhone] = useState(
    technician?.phone && technician.phone !== '—' ? technician.phone : '',
  )
  const [email, setEmail] = useState(
    technician?.email && technician.email !== '—' ? technician.email : '',
  )
  const [role, setRole] = useState(technician?.role ?? '')
  const [serviceAreaId, setServiceAreaId] = useState(technician?.serviceAreaId ?? '')
  const [notes, setNotes] = useState(technician?.notes ?? '')
  const [sendInvite, setSendInvite] = useState(!editing)
  const [active, setActive] = useState(technician?.appActive ?? true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!technician) return
    setName(technician.name)
    setPhone(technician.phone !== '—' ? technician.phone : '')
    setEmail(technician.email !== '—' ? technician.email : '')
    setRole(technician.role)
    setServiceAreaId(technician.serviceAreaId ?? '')
    setNotes(technician.notes)
    setActive(technician.appActive)
  }, [technician])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canMutate || pending) return
    if (!name.trim()) {
      setError('Enter a technician name.')
      return
    }
    if (!phone.trim()) {
      setError('Enter a phone number.')
      return
    }
    if (!isValidPhone(phone)) {
      setError('Enter a valid phone number.')
      return
    }
    if (sendInvite && !editing && !email.trim()) {
      setError('Email is required when sending an invite.')
      return
    }
    if (email.trim() && !isValidEmail(email)) {
      setError('Enter a valid email address.')
      return
    }
    setError(null)
    await onSave({
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
      role: role.trim() || 'Technician',
      serviceAreaId: serviceAreaId || null,
      notes: notes.trim(),
      sendInvite: !editing && sendInvite,
      active,
    })
  }

  return (
    <div className="animate-slide-in-right space-y-6">
      <header>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          {editing ? content.editTitle : content.addTitle}
        </h1>
        <p className="mt-1 text-xs text-muted">
          {editing ? content.editSubtitle : content.addSubtitle}
        </p>
      </header>

      <form id="technician-form" onSubmit={(event) => void handleSubmit(event)}>
        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
          <h2 className="text-base font-semibold text-foreground">{content.personalDetails}</h2>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <Field label={content.fullName} required labelWeight="medium" size="sm">
              <Input
                inputSize="sm"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. James Smith"
                disabled={!canMutate || pending}
              />
            </Field>
            <Field label={content.mobile} required labelWeight="medium" size="sm">
              <PhoneInput
                inputSize="sm"
                value={phone}
                onValueChange={setPhone}
                placeholder="e.g. 07700 900000"
                disabled={!canMutate || pending}
              />
            </Field>
            <Field label={content.email} labelWeight="medium" size="sm">
              <Input
                type="email"
                inputSize="sm"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="e.g. james@example.com"
                disabled={!canMutate || pending}
              />
            </Field>
            <Field label={content.role} labelWeight="medium" size="sm">
              <Select
                inputSize="sm"
                value={role}
                onChange={(event) => setRole(event.target.value)}
                options={[
                  { value: '', label: 'Select role...' },
                  { value: 'Lead Technician', label: 'Lead Technician' },
                  { value: 'Technician', label: 'Technician' },
                  { value: 'Trainee Technician', label: 'Trainee Technician' },
                ]}
                className="border-primary/20 bg-accent-surface"
                disabled={!canMutate || pending}
              />
            </Field>
            <Field label={content.area} labelWeight="medium" size="sm">
              <Select
                inputSize="sm"
                value={serviceAreaId}
                onChange={(event) => setServiceAreaId(event.target.value)}
                options={areaOptions}
                className="border-primary/20 bg-accent-surface"
                disabled={!canMutate || pending || areasQuery.isPending}
              />
            </Field>
            <Field
              label={`${content.notes}${editing ? '' : ` (${content.optional})`}`}
              labelWeight="medium"
              size="sm"
            >
              <Textarea
                inputSize="sm"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Any specific notes..."
                disabled={!canMutate || pending}
              />
            </Field>
          </div>

          <div className="mt-6 border-t border-border pt-6">
            <h2 className="text-base font-semibold text-foreground">{content.appAccess}</h2>
            <div className="mt-4 flex items-center justify-between gap-5">
              <div>
                <p className="text-xs font-medium text-foreground">
                  {editing ? content.appAccessActive : content.inviteBySms}
                  {editing && active ? (
                    <span className="ml-2 rounded-md bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
                      {technician?.appStatus === 'PENDING_INVITE' ? 'Pending invite' : 'Active'}
                    </span>
                  ) : null}
                </p>
                <p className="mt-1 text-xs text-muted">
                  {editing ? (
                    <>
                      {content.inviteSent}{' '}
                      {canMutate && onResendInvite && email.trim() ? (
                        <button
                          type="button"
                          className="font-semibold underline disabled:opacity-50"
                          disabled={resendPending || pending}
                          onClick={() => void onResendInvite()}
                        >
                          {resendPending ? 'Sending…' : content.resend}
                        </button>
                      ) : null}
                    </>
                  ) : (
                    content.inviteDescription
                  )}
                </p>
              </div>
              <Toggle
                checked={editing ? active : sendInvite}
                onChange={editing ? setActive : setSendInvite}
                ariaLabel={editing ? content.appAccessActive : content.inviteBySms}
                disabled={!canMutate || pending}
              />
            </div>

            {!editing && sendInvite ? (
              <div className="mt-5 flex gap-2 rounded-xl border border-primary/40 bg-accent-surface p-3 text-xs text-primary">
                <DashboardIcon name="info" className="h-4 w-4 shrink-0" />
                {content.inviteNotice}
              </div>
            ) : null}
          </div>

          {editing && canMutate ? (
            <div className="mt-6 border-t border-border pt-6">
              <h2 className="text-base font-semibold text-danger">{content.danger}</h2>
              <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-muted">{content.dangerDescription}</p>
                <button
                  type="button"
                  onClick={onRemove}
                  disabled={pending || !technician?.appActive}
                  className="shrink-0 rounded-lg border border-danger px-4 py-2 text-xs font-semibold text-danger transition-colors hover:bg-danger/5 disabled:opacity-50"
                >
                  {content.remove}
                </button>
              </div>
            </div>
          ) : null}

          {error ? <p className="mt-5 text-xs text-danger">{error}</p> : null}
        </section>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="px-5 py-2.5 text-xs font-medium text-muted hover:text-foreground disabled:opacity-50"
          >
            {content.cancel}
          </button>
          <button
            type="submit"
            disabled={!canMutate || pending}
            className="rounded-lg bg-primary px-6 py-2.5 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {pending ? 'Saving…' : editing ? content.save : content.add}
          </button>
        </div>
      </form>
    </div>
  )
}

export function toCreateInput(values: TechnicianFormValues): TechnicianCreateInput {
  return {
    name: values.name,
    phone: values.phone || undefined,
    role: values.role || undefined,
    email: values.email || null,
    notes: values.notes || null,
    serviceAreaId: values.serviceAreaId,
    sendInvite: values.sendInvite,
  }
}

export function toUpdateInput(values: TechnicianFormValues): TechnicianUpdateInput {
  return {
    name: values.name,
    phone: values.phone || undefined,
    role: values.role || undefined,
    email: values.email || null,
    notes: values.notes || null,
    serviceAreaId: values.serviceAreaId,
    active: values.active,
  }
}
