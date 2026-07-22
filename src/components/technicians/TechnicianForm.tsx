import type { FormEvent } from 'react'
import { useState } from 'react'
import type { TechnicianRecord } from '@/content/technicians'
import { techniciansContent } from '@/content/technicians'
import { Field, Input, Select, Textarea, Toggle } from '@/components/ui'
import { DashboardIcon } from '@/components/dashboard/DashboardIcon'

interface TechnicianFormProps {
  mode: 'add' | 'edit'
  technician?: TechnicianRecord
  onCancel: () => void
  onSave: () => void
  onRemove: () => void
}

/** Add/edit technician form used by the dedicated technician routes. */
export function TechnicianForm({
  mode,
  technician,
  onCancel,
  onSave,
  onRemove,
}: TechnicianFormProps) {
  const content = techniciansContent.form
  const editing = mode === 'edit'
  const [name, setName] = useState(technician?.name ?? '')
  const [phone, setPhone] = useState(technician?.phone ?? '')
  const [email, setEmail] = useState(technician?.email ?? '')
  const [role, setRole] = useState(technician?.role ?? '')
  const [area, setArea] = useState(technician?.areas.join(', ') ?? '')
  const [notes, setNotes] = useState(technician?.notes ?? '')
  const [appActive, setAppActive] = useState(technician?.appActive ?? true)
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!name.trim() || !phone.trim() || !role || !area) {
      setError('Complete the required technician details.')
      return
    }
    onSave()
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

      <form id="technician-form" onSubmit={handleSubmit}>
        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
          <h2 className="text-base font-semibold text-foreground">{content.personalDetails}</h2>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <Field label={content.fullName} required labelWeight="medium" size="sm">
              <Input
                inputSize="sm"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. James Smith"
              />
            </Field>
            <Field label={content.mobile} required labelWeight="medium" size="sm">
              <Input
                type="tel"
                inputSize="sm"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="e.g. 07700 900000"
              />
            </Field>
            <Field label={content.email} labelWeight="medium" size="sm">
              <Input
                type="email"
                inputSize="sm"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="e.g. james@example.com"
              />
            </Field>
            <Field label={content.role} required labelWeight="medium" size="sm">
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
              />
            </Field>
            <Field label={content.area} required labelWeight="medium" size="sm">
              <Select
                inputSize="sm"
                value={area}
                onChange={(event) => setArea(event.target.value)}
                options={[
                  { value: '', label: 'Select area...' },
                  { value: 'Alnwick, Morpeth', label: 'Alnwick, Morpeth' },
                  { value: 'Alnwick', label: 'Alnwick' },
                  { value: 'Morpeth', label: 'Morpeth' },
                  { value: 'Rothbury', label: 'Rothbury' },
                ]}
                className="border-primary/20 bg-accent-surface"
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
              />
            </Field>
          </div>

          <div className="mt-6 border-t border-border pt-6">
            <h2 className="text-base font-semibold text-foreground">{content.appAccess}</h2>
            <div className="mt-4 flex items-center justify-between gap-5">
              <div>
                <p className="text-xs font-medium text-foreground">
                  {editing ? content.appAccessActive : content.inviteBySms}
                  {editing && appActive ? (
                    <span className="ml-2 rounded-md bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
                      Active
                    </span>
                  ) : null}
                </p>
                <p className="mt-1 text-xs text-muted">
                  {editing ? (
                    <>
                      {content.inviteSent}{' '}
                      <button type="button" className="font-semibold underline">
                        {content.resend}
                      </button>
                    </>
                  ) : (
                    content.inviteDescription
                  )}
                </p>
              </div>
              <Toggle
                checked={appActive}
                onChange={setAppActive}
                ariaLabel={editing ? content.appAccessActive : content.inviteBySms}
              />
            </div>

            {!editing && appActive ? (
              <div className="mt-5 flex gap-2 rounded-xl border border-primary/40 bg-accent-surface p-3 text-xs text-primary">
                <DashboardIcon name="info" className="h-4 w-4 shrink-0" />
                {content.inviteNotice}
              </div>
            ) : null}
          </div>

          {editing ? (
            <div className="mt-6 border-t border-border pt-6">
              <h2 className="text-base font-semibold text-danger">{content.danger}</h2>
              <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-muted">{content.dangerDescription}</p>
                <button
                  type="button"
                  onClick={onRemove}
                  className="shrink-0 rounded-lg border border-danger px-4 py-2 text-xs font-semibold text-danger transition-colors hover:bg-danger/5"
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
            className="px-5 py-2.5 text-xs font-medium text-muted hover:text-foreground"
          >
            {content.cancel}
          </button>
          <button
            type="submit"
            className="rounded-lg bg-primary px-6 py-2.5 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            {editing ? content.save : content.add}
          </button>
        </div>
      </form>
    </div>
  )
}
