import { useEffect, useState } from 'react'
import { dashboardContent } from '@/content/dashboard'
import { DashboardIcon } from '@/components/dashboard/DashboardIcon'
import { Field, Input, Select, Textarea } from '@/components/ui'
import { Modal, ModalButton } from '@/components/ui/modal'

interface AddOneOffJobModalProps {
  open: boolean
  onClose: () => void
}

interface OneOffJobFormState {
  customerId: string
  serviceTypeId: string
  date: string
  time: string
  price: string
  technicianId: string
  paymentMethodId: string
  notes: string
}

/** One-off visit composer — opened from the sidebar quick action. */
export function AddOneOffJobModal({ open, onClose }: AddOneOffJobModalProps) {
  const { oneOffJobModal } = dashboardContent
  const { fields, notice, actions, defaults, customers, serviceTypes, technicians, paymentMethods } =
    oneOffJobModal

  const [form, setForm] = useState<OneOffJobFormState>(defaults)

  useEffect(() => {
    if (!open) return
    setForm(defaults)
  }, [open, defaults])

  function updateField<K extends keyof OneOffJobFormState>(key: K, value: OneOffJobFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function handleCreate() {
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      showCloseButton
      stacked
      size="compact"
      maxWidthClass="max-w-md"
      title={oneOffJobModal.title}
      subtitle={oneOffJobModal.subtitle}
      footer={
        <div className="grid grid-cols-2 gap-2.5">
          <ModalButton compact variant="secondary" className="w-full" onClick={onClose}>
            {actions.cancel}
          </ModalButton>
          <ModalButton compact variant="primary" className="w-full" onClick={handleCreate}>
            {actions.create}
          </ModalButton>
        </div>
      }
    >
      <div className="space-y-3">
        <Field label={fields.customer.label} required labelWeight="medium" size="sm">
          <Select
            inputSize="sm"
            value={form.customerId}
            onChange={(event) => updateField('customerId', event.target.value)}
            options={customers.map((customer) => ({
              value: customer.id,
              label: customer.label,
            }))}
          />
        </Field>

        <Field label={fields.serviceType.label} required labelWeight="medium" size="sm">
          <Select
            inputSize="sm"
            value={form.serviceTypeId}
            onChange={(event) => updateField('serviceTypeId', event.target.value)}
            options={[...serviceTypes]}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label={fields.date.label} required labelWeight="medium" size="sm">
            <Input
              inputSize="sm"
              type="date"
              value={form.date}
              onChange={(event) => updateField('date', event.target.value)}
            />
          </Field>

          <Field label={fields.time.label} labelWeight="medium" size="sm">
            <Input
              inputSize="sm"
              type="time"
              value={form.time}
              onChange={(event) => updateField('time', event.target.value)}
            />
          </Field>
        </div>

        <Field label={fields.price.label} required labelWeight="medium" size="sm">
          <div className="relative">
            <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-xs text-muted">
              £
            </span>
            <Input
              inputSize="sm"
              inputMode="decimal"
              value={form.price}
              onChange={(event) => updateField('price', event.target.value)}
              className="pl-7"
            />
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label={fields.technician.label} labelWeight="medium" size="sm">
            <Select
              inputSize="sm"
              value={form.technicianId}
              onChange={(event) => updateField('technicianId', event.target.value)}
              options={[...technicians]}
            />
          </Field>

          <Field label={fields.paymentMethod.label} required labelWeight="medium" size="sm">
            <Select
              inputSize="sm"
              value={form.paymentMethodId}
              onChange={(event) => updateField('paymentMethodId', event.target.value)}
              options={[...paymentMethods]}
            />
          </Field>
        </div>

        <Field label={fields.notes.label} labelWeight="medium" size="sm">
          <Textarea
            inputSize="sm"
            value={form.notes}
            onChange={(event) => updateField('notes', event.target.value)}
            placeholder={fields.notes.placeholder}
            rows={2}
            className="min-h-[3.25rem]"
          />
        </Field>

        <div className="flex gap-2.5 rounded-lg border border-accent/25 bg-accent-surface px-3 py-2.5">
          <DashboardIcon name="calendar" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
          <div className="min-w-0 text-[11px] leading-snug">
            <p className="font-medium text-accent">{notice.title}</p>
            <p className="mt-0.5 text-accent/90">{notice.body}</p>
          </div>
        </div>
      </div>
    </Modal>
  )
}
