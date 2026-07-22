import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'
import type { ComplaintPriority } from '@/content/complaints'
import { complaintsContent } from '@/content/complaints'
import { DashboardIcon } from '@/components/dashboard/DashboardIcon'
import { Input, Select, Textarea } from '@/components/ui'
import { Modal } from '@/components/ui/modal'
import { cn } from '@/lib/utils'

export interface NewComplaintValues {
  customer: string
  address: string
  phone: string
  email: string
  issueType: string
  description: string
  priority: ComplaintPriority
  technician: string
  visitDate: string
}

interface LogComplaintModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (values: NewComplaintValues) => void
}

const initialValues: NewComplaintValues = {
  customer: '',
  address: '',
  phone: '',
  email: '',
  issueType: '',
  description: '',
  priority: 'medium',
  technician: '',
  visitDate: '',
}

/** Frontend-only complaint creation form matching the supplied modal design. */
export function LogComplaintModal({ open, onClose, onSubmit }: LogComplaintModalProps) {
  const { modal } = complaintsContent
  const [values, setValues] = useState<NewComplaintValues>(initialValues)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setValues(initialValues)
    setError(null)
  }, [open])

  function update<K extends keyof NewComplaintValues>(key: K, value: NewComplaintValues[K]) {
    setValues((current) => ({ ...current, [key]: value }))
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!values.customer.trim() || !values.description.trim() || !values.issueType) {
      setError('Add a customer, issue type, and complaint description.')
      return
    }
    onSubmit(values)
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={modal.title}
      subtitle={modal.subtitle}
      showCloseButton
      stacked
      size="compact"
      maxWidthClass="max-w-lg"
      className="max-h-[min(92dvh,44rem)] rounded-2xl"
      headerClassName="pl-16"
      bodyClassName="space-y-4"
      footer={
        <div className="flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-medium text-muted transition-colors hover:text-foreground"
          >
            {modal.cancel}
          </button>
          <button
            type="submit"
            form="log-complaint-form"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            <DashboardIcon name="flag" className="h-4 w-4" />
            {modal.submit}
          </button>
        </div>
      }
    >
      <span className="absolute top-4 left-5 flex h-9 w-9 items-center justify-center rounded-lg bg-danger/10 text-danger">
        <DashboardIcon name="flag" className="h-5 w-5" />
      </span>

      <form id="log-complaint-form" onSubmit={handleSubmit} className="space-y-4">
        <FormSection title={modal.customerSection}>
          <Input
            inputSize="sm"
            value={values.customer}
            onChange={(event) => update('customer', event.target.value)}
            placeholder={`${modal.customerPlaceholder} *`}
          />
          <Input
            inputSize="sm"
            value={values.address}
            onChange={(event) => update('address', event.target.value)}
            placeholder={modal.addressPlaceholder}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              type="tel"
              inputSize="sm"
              value={values.phone}
              onChange={(event) => update('phone', event.target.value)}
              placeholder={modal.phonePlaceholder}
            />
            <Input
              type="email"
              inputSize="sm"
              value={values.email}
              onChange={(event) => update('email', event.target.value)}
              placeholder={modal.emailPlaceholder}
            />
          </div>
        </FormSection>

        <FormSection title={modal.complaintSection}>
          <Select
            inputSize="sm"
            value={values.issueType}
            onChange={(event) => update('issueType', event.target.value)}
            options={[
              { value: '', label: modal.issuePlaceholder },
              ...modal.issueTypes.map((issue) => ({ value: issue, label: issue })),
            ]}
            className="border-primary/30 bg-accent-surface"
          />
          <Textarea
            inputSize="sm"
            value={values.description}
            onChange={(event) => update('description', event.target.value)}
            placeholder={`${modal.descriptionPlaceholder} *`}
          />
        </FormSection>

        <fieldset>
          <legend className="mb-2 text-[11px] font-semibold tracking-wider text-muted uppercase">
            {modal.priorityLabel}
          </legend>
          <div className="grid grid-cols-3 gap-2">
            {(['low', 'medium', 'high'] as const).map((priority) => (
              <button
                key={priority}
                type="button"
                onClick={() => update('priority', priority)}
                className={cn(
                  'rounded-lg border px-3 py-2 text-xs font-semibold capitalize transition-colors',
                  values.priority === priority
                    ? 'border-warning-border bg-warning-surface text-warning-foreground'
                    : 'border-border bg-card text-muted hover:text-foreground',
                )}
              >
                {priority}
              </button>
            ))}
          </div>
        </fieldset>

        <FormSection title={modal.visitSection}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Select
              inputSize="sm"
              value={values.technician}
              onChange={(event) => update('technician', event.target.value)}
              options={[
                { value: '', label: modal.technicianPlaceholder },
                ...modal.technicians.map((name) => ({ value: name, label: name })),
              ]}
              className="border-primary/30 bg-accent-surface"
            />
            <Input
              type="date"
              inputSize="sm"
              aria-label={modal.datePlaceholder}
              value={values.visitDate}
              onChange={(event) => update('visitDate', event.target.value)}
              className="border-primary/30 bg-accent-surface"
            />
          </div>
        </FormSection>

        {error ? <p className="text-xs text-danger">{error}</p> : null}
      </form>
    </Modal>
  )
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2.5">
      <h3 className="text-[11px] font-semibold tracking-wider text-muted uppercase">{title}</h3>
      {children}
    </section>
  )
}
