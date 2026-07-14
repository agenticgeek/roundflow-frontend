import { useEffect, useMemo, useState } from 'react'
import type { PropertyDetailRecord } from '@/content/property-detail'
import { propertyDetailContent } from '@/content/property-detail'
import { DashboardIcon } from '@/components/dashboard/DashboardIcon'
import { Field, Input, Select, Textarea } from '@/components/ui'
import { Modal, ModalButton, modalInputClass } from '@/components/ui/modal'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'

interface EditCustomerRecordModalProps {
  open: boolean
  property: PropertyDetailRecord | null
  onClose: () => void
}

interface EditCustomerForm {
  fullName: string
  phone: string
  email: string
  streetAddress: string
  postcode: string
  propertyType: string
  frequency: string
  price: string
  cleanMethod: string
  paymentMethod: string
  accessNotes: string
  riskNotes: string
}

const modalSelectClass = cn(modalInputClass, 'border-accent/25 bg-accent-surface rounded-lg')

function splitAddress(address: string) {
  const parts = address.split(',').map((part) => part.trim())
  if (parts.length >= 2) {
    return {
      street: parts.slice(0, -1).join(', '),
      postcode: parts[parts.length - 1],
    }
  }
  return { street: address, postcode: '' }
}

function priceValue(price: string) {
  return price.replace(/[£,\s]/g, '')
}

function frequencyOptionValue(frequency: string) {
  if (frequency.toLowerCase().includes('8')) return 'every-8-weeks'
  if (frequency.toLowerCase().includes('month')) return 'monthly'
  return 'every-4-weeks'
}

function cleanMethodOptionValue(method: string) {
  return method.toLowerCase().includes('traditional') ? 'traditional' : 'water-fed-pole'
}

function paymentMethodOptionValue(method: string) {
  const normalized = method.toLowerCase()
  if (normalized.includes('cash')) return 'cash'
  if (normalized.includes('bank')) return 'bank-transfer'
  return 'gocardless'
}

function buildForm(property: PropertyDetailRecord): EditCustomerForm {
  const { street, postcode } = splitAddress(property.fullAddress)

  return {
    fullName: property.customerName,
    phone: property.phone,
    email: property.email,
    streetAddress: street,
    postcode,
    propertyType: property.propertyType.toLowerCase().includes('commercial') ? 'commercial' : 'residential',
    frequency: frequencyOptionValue(property.frequency),
    price: priceValue(property.price),
    cleanMethod: cleanMethodOptionValue(property.cleanMethod),
    paymentMethod:
      property.paymentMethod === '—'
        ? 'gocardless'
        : paymentMethodOptionValue(property.paymentMethod),
    accessNotes: property.accessNotes === 'No access notes' ? '' : property.accessNotes,
    riskNotes: property.riskNotes === 'No risk notes' ? '' : property.riskNotes,
  }
}

function ModalSection({
  icon,
  title,
  children,
}: {
  icon?: string
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="space-y-3">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
        {icon ? <DashboardIcon name={icon} className="h-4 w-4 text-primary" /> : null}
        {title}
      </h3>
      {children}
    </section>
  )
}

function IconInput({
  icon,
  className,
  ...props
}: React.ComponentProps<typeof Input> & { icon: string }) {
  return (
    <div className="relative">
      <DashboardIcon
        name={icon}
        className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted"
      />
      <Input inputSize="sm" className={cn('pl-10', className)} {...props} />
    </div>
  )
}

/** Edit customer/property record — opened from property detail header. */
export function EditCustomerRecordModal({ open, property, onClose }: EditCustomerRecordModalProps) {
  const { editCustomerModal } = propertyDetailContent
  const { showToast } = useToast()
  const [form, setForm] = useState<EditCustomerForm | null>(null)

  useEffect(() => {
    if (!open || !property) return
    setForm(buildForm(property))
  }, [open, property])

  const subtitle = useMemo(() => {
    if (!property) return ''
    const { street } = splitAddress(property.fullAddress)
    return editCustomerModal.subtitle
      .replace('{customer}', property.customerName)
      .replace('{street}', street)
  }, [editCustomerModal.subtitle, property])

  if (!property || !form) return null

  function updateField<K extends keyof EditCustomerForm>(key: K, value: EditCustomerForm[K]) {
    setForm((current) => (current ? { ...current, [key]: value } : current))
  }

  function handleSave() {
    onClose()
    showToast(editCustomerModal.successToast)
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editCustomerModal.title}
      subtitle={subtitle}
      showCloseButton
      stacked
      size="compact"
      maxWidthClass="max-w-2xl"
      headerClassName="pl-16"
      bodyClassName="space-y-6"
      footer={
        <div className="grid grid-cols-2 gap-3">
          <ModalButton compact variant="secondary" className="w-full" onClick={onClose}>
            {editCustomerModal.actions.cancel}
          </ModalButton>
          <ModalButton compact variant="primary" className="w-full" onClick={handleSave}>
            {editCustomerModal.actions.save}
          </ModalButton>
        </div>
      }
    >
      <span className="absolute top-4 left-5 flex h-9 w-9 items-center justify-center rounded-none bg-accent-surface text-accent">
        <DashboardIcon name="user" className="h-5 w-5" />
      </span>

      <ModalSection icon="user" title={editCustomerModal.sections.contactDetails}>
        <Field label={editCustomerModal.fields.fullName} size="sm" labelWeight="medium">
          <Input
            inputSize="sm"
            value={form.fullName}
            onChange={(event) => updateField('fullName', event.target.value)}
            className={cn(modalInputClass, 'rounded-lg bg-card')}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={editCustomerModal.fields.phone} size="sm" labelWeight="medium">
            <IconInput
              icon="phone"
              value={form.phone}
              onChange={(event) => updateField('phone', event.target.value)}
              className={cn(modalInputClass, 'rounded-lg bg-card')}
            />
          </Field>
          <Field label={editCustomerModal.fields.email} size="sm" labelWeight="medium">
            <IconInput
              icon="mail"
              type="email"
              value={form.email}
              onChange={(event) => updateField('email', event.target.value)}
              className={cn(modalInputClass, 'rounded-lg bg-card')}
            />
          </Field>
        </div>
      </ModalSection>

      <ModalSection icon="home" title={editCustomerModal.sections.propertyAddress}>
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_9rem]">
          <Field label={editCustomerModal.fields.streetAddress} size="sm" labelWeight="medium">
            <Input
              inputSize="sm"
              value={form.streetAddress}
              onChange={(event) => updateField('streetAddress', event.target.value)}
              className={cn(modalInputClass, 'rounded-lg bg-card')}
            />
          </Field>
          <Field label={editCustomerModal.fields.postcode} size="sm" labelWeight="medium">
            <Input
              inputSize="sm"
              value={form.postcode}
              onChange={(event) => updateField('postcode', event.target.value)}
              className={cn(modalInputClass, 'rounded-lg bg-card')}
            />
          </Field>
        </div>

        <Field label={editCustomerModal.fields.propertyType} size="sm" labelWeight="medium">
          <Select
            inputSize="sm"
            value={form.propertyType}
            onChange={(event) => updateField('propertyType', event.target.value)}
            options={[...editCustomerModal.propertyTypeOptions]}
            className={modalSelectClass}
          />
        </Field>
      </ModalSection>

      <ModalSection title={editCustomerModal.sections.serviceDetails}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={editCustomerModal.fields.frequency} size="sm" labelWeight="medium">
            <Select
              inputSize="sm"
              value={form.frequency}
              onChange={(event) => updateField('frequency', event.target.value)}
              options={[...editCustomerModal.frequencyOptions]}
              className={modalSelectClass}
            />
          </Field>
          <Field label={editCustomerModal.fields.price} size="sm" labelWeight="medium">
            <Input
              inputSize="sm"
              value={form.price}
              onChange={(event) => updateField('price', event.target.value)}
              className={cn(modalInputClass, 'rounded-lg border-accent/25 bg-accent-surface')}
            />
          </Field>
          <Field label={editCustomerModal.fields.cleanMethod} size="sm" labelWeight="medium">
            <Select
              inputSize="sm"
              value={form.cleanMethod}
              onChange={(event) => updateField('cleanMethod', event.target.value)}
              options={[...editCustomerModal.cleanMethodOptions]}
              className={modalSelectClass}
            />
          </Field>
          <Field label={editCustomerModal.fields.paymentMethod} size="sm" labelWeight="medium">
            <Select
              inputSize="sm"
              value={form.paymentMethod}
              onChange={(event) => updateField('paymentMethod', event.target.value)}
              options={[...editCustomerModal.paymentMethodOptions]}
              className={modalSelectClass}
            />
          </Field>
        </div>
      </ModalSection>

      <ModalSection title={editCustomerModal.sections.notes}>
        <Field
          label={
            <span className="inline-flex items-center gap-1.5">
              <DashboardIcon name="alert-circle" className="h-4 w-4 text-warning" />
              {editCustomerModal.fields.accessNotes}
            </span>
          }
          size="sm"
          labelWeight="medium"
        >
          <Textarea
            inputSize="sm"
            value={form.accessNotes}
            onChange={(event) => updateField('accessNotes', event.target.value)}
            placeholder={editCustomerModal.placeholders.accessNotes}
            className={cn(modalInputClass, 'min-h-24 rounded-lg bg-card')}
          />
        </Field>

        <Field
          label={
            <span className="inline-flex flex-wrap items-center gap-1.5">
              <DashboardIcon name="alert" className="h-4 w-4 text-danger" />
              {editCustomerModal.fields.riskNotes}
              <span className="font-normal text-danger">{editCustomerModal.fields.riskNotesHint}</span>
            </span>
          }
          size="sm"
          labelWeight="medium"
        >
          <Textarea
            inputSize="sm"
            value={form.riskNotes}
            onChange={(event) => updateField('riskNotes', event.target.value)}
            placeholder={editCustomerModal.placeholders.riskNotes}
            className={cn(
              modalInputClass,
              'min-h-24 rounded-lg border-danger/30 bg-card focus:border-danger focus:ring-danger/10',
            )}
          />
        </Field>
      </ModalSection>
    </Modal>
  )
}
