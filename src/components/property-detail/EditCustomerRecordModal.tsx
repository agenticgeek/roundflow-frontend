import { useEffect, useMemo, useState } from 'react'
import type { PropertyDetailRecord } from '@/content/property-detail'
import { propertyDetailContent } from '@/content/property-detail'
import { DashboardIcon } from '@/components/dashboard/DashboardIcon'
import { Field, Input, Select, Textarea } from '@/components/ui'
import { Modal, ModalButton, modalInputClass } from '@/components/ui/modal'
import { useToast } from '@/components/ui/toast'
import type { CleaningFrequency, PaymentMethod, PropertyType } from '@/api/types'
import { useUpdateCustomer } from '@/features/customers/hooks/useCustomers'
import { useSetPropertyServices, useUpdateProperty } from '@/features/properties/hooks/useProperties'
import { useServices } from '@/features/settings/hooks/useSettings'
import { usePaymentSettings } from '@/features/settings/hooks/useSettings'
import { useUpdateServicePlan } from '@/features/service-plans/hooks/useServicePlans'
import { useAppBootstrap } from '@/providers/AppBootstrapProvider'
import { ApiError, errorMessage } from '@/lib/errors'
import { isValidEmail, isValidPhone } from '@/lib/contact'
import { isValidUkPostcode } from '@/lib/postcode'
import { cn } from '@/lib/utils'

interface EditCustomerRecordModalProps {
  open: boolean
  property: PropertyDetailRecord | null
  customerId: string
  onClose: () => void
}

interface EditCustomerForm {
  fullName: string
  phone: string
  landline: string
  email: string
  streetAddress: string
  postcode: string
  propertyType: string
  frequency: string
  price: string
  cleanMethod: string
  /** '' = the plan has none yet — never sent unless the user picks one. */
  paymentMethod: PaymentMethod | ''
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
  const normalized = frequency.toLowerCase()
  if (normalized.includes('12')) return 'every-12-weeks'
  if (normalized.includes('8')) return 'every-8-weeks'
  if (normalized.includes('6')) return 'every-6-weeks'
  return 'every-4-weeks'
}

/** '' when the plan has no clean method — it must not turn into "Water Fed Pole" by saving. */
function cleanMethodOptionValue(method: string) {
  const normalized = method.toLowerCase()
  if (normalized.includes('traditional')) return 'traditional'
  if (normalized.includes('water')) return 'water-fed-pole'
  return ''
}

function buildForm(property: PropertyDetailRecord): EditCustomerForm {
  const { street, postcode } = splitAddress(property.fullAddress)

  return {
    fullName: property.customerName,
    phone: property.phone,
    landline: property.landline,
    email: property.email,
    streetAddress: street,
    postcode,
    propertyType: property.propertyType.toLowerCase().includes('commercial') ? 'commercial' : 'residential',
    frequency: frequencyOptionValue(property.frequency),
    price: priceValue(property.price),
    cleanMethod: cleanMethodOptionValue(property.cleanMethod),
    paymentMethod: property.paymentMethodCode ?? '',
    accessNotes: property.accessNotes === 'No access notes' ? '' : property.accessNotes,
    riskNotes: property.riskNotes === 'No risk notes' ? '' : property.riskNotes,
  }
}

/** Live (non-cancelled) plans that belong to a catalogue service → serviceId → price text. */
function initialServicePrices(property: PropertyDetailRecord): Record<string, string> {
  const prices: Record<string, string> = {}
  for (const plan of property.servicePlans ?? []) {
    if (plan.status === 'cancelled' || !plan.serviceId) continue
    prices[plan.serviceId] = plan.values.price != null ? String(plan.values.price) : ''
  }
  return prices
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

function toApiFrequency(value: string): CleaningFrequency {
  if (value === 'every-12-weeks') return 'TWELVE_WEEKLY'
  if (value === 'every-8-weeks') return 'EIGHT_WEEKLY'
  if (value === 'every-6-weeks') return 'SIX_WEEKLY'
  return 'FOUR_WEEKLY'
}

function toApiPropertyType(value: string): PropertyType {
  return value === 'commercial' ? 'COMMERCIAL' : 'HOUSE'
}

function toApiCleanMethod(value: string) {
  return value === 'traditional' ? 'Traditional' : 'Water Fed Pole'
}

/** Edit customer/property record — opened from property detail header. */
export function EditCustomerRecordModal({
  open,
  property,
  customerId,
  onClose,
}: EditCustomerRecordModalProps) {
  const { editCustomerModal } = propertyDetailContent
  const { showToast } = useToast()
  const { canMutate } = useAppBootstrap()
  const updateCustomer = useUpdateCustomer(customerId)
  const updateProperty = useUpdateProperty()
  const updatePlan = useUpdateServicePlan()
  const paymentSettings = usePaymentSettings()
  const setServices = useSetPropertyServices()
  const servicesQuery = useServices(open)
  const [form, setForm] = useState<EditCustomerForm | null>(null)
  const [initialForm, setInitialForm] = useState<EditCustomerForm | null>(null)
  /** serviceId → price text; a key means the service is ticked. */
  const [serviceSel, setServiceSel] = useState<Record<string, string>>({})
  const [initialServiceSel, setInitialServiceSel] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !property) return
    const next = buildForm(property)
    setForm(next)
    setInitialForm(next)
    const selected = initialServicePrices(property)
    setServiceSel(selected)
    setInitialServiceSel(selected)
    setError(null)
  }, [open, property])

  const subtitle = useMemo(() => {
    if (!property) return ''
    const { street } = splitAddress(property.fullAddress)
    return editCustomerModal.subtitle
      .replace('{customer}', property.customerName)
      .replace('{street}', street)
  }, [editCustomerModal.subtitle, property])

  // Only warn once the connection status is known — an unloaded query must not read as "not connected".
  const notConnectedWarning =
    form?.paymentMethod === 'GOCARDLESS' && paymentSettings.data && !paymentSettings.data.gocardlessConnected
      ? editCustomerModal.notConnected.GOCARDLESS
      : form?.paymentMethod === 'STRIPE' && paymentSettings.data && !paymentSettings.data.stripeConnected
        ? editCustomerModal.notConnected.STRIPE
        : null

  const saving =
    updateCustomer.isPending || updateProperty.isPending || updatePlan.isPending || setServices.isPending

  const catalogue = useMemo(
    () => (servicesQuery.data ?? []).filter((service) => service.id && service.name && service.active !== false),
    [servicesQuery.data],
  )
  // Services mode: the property's plans come from catalogue services, so the price is their sum.
  const servicesMode = Object.keys(initialServiceSel).length > 0 && catalogue.length > 0
  const priceOf = (serviceId: string) => {
    const typed = Number(serviceSel[serviceId])
    if (Number.isFinite(typed) && serviceSel[serviceId] !== '') return typed
    return Number(catalogue.find((service) => service.id === serviceId)?.defaultPrice ?? 0) || 0
  }
  const servicesTotal = Object.keys(serviceSel).reduce((sum, id) => sum + priceOf(id), 0)

  if (!property || !form || !initialForm) return null

  function updateField<K extends keyof EditCustomerForm>(key: K, value: EditCustomerForm[K]) {
    setForm((current) => (current ? { ...current, [key]: value } : current))
    if (error) setError(null)
  }

  function toggleService(serviceId: string, checked: boolean) {
    setServiceSel((current) => {
      const next = { ...current }
      if (checked) {
        next[serviceId] = String(catalogue.find((service) => service.id === serviceId)?.defaultPrice ?? '')
      } else {
        delete next[serviceId]
      }
      return next
    })
    if (error) setError(null)
  }

  function validate(price: number): boolean {
    const { validation } = editCustomerModal
    if (!form) return false
    if (!form.fullName.trim()) return setError(validation.fullNameRequired), false
    if (!form.phone.trim()) return setError(validation.phoneRequired), false
    if (!isValidPhone(form.phone)) return setError(validation.phoneInvalid), false
    if (form.landline.trim() && !isValidPhone(form.landline)) {
      return setError(validation.landlineInvalid), false
    }
    if (form.email.trim() && !isValidEmail(form.email)) return setError(validation.emailInvalid), false
    if (!form.streetAddress.trim()) return setError(validation.streetAddressRequired), false
    if (!form.postcode.trim()) return setError(validation.postcodeRequired), false
    if (!isValidUkPostcode(form.postcode)) return setError(validation.postcodeInvalid), false
    if (servicesMode) {
      if (Object.keys(serviceSel).length === 0) return setError(validation.servicesRequired), false
      for (const id of Object.keys(serviceSel)) {
        if (!Number.isFinite(priceOf(id)) || priceOf(id) < 0) return setError(validation.priceInvalid), false
      }
      return true
    }
    if (!Number.isFinite(price) || price <= 0) return setError(validation.priceInvalid), false
    return true
  }

  async function handleSave() {
    if (!canMutate || !form || !initialForm || !property || saving) return
    const price = Number(form.price)
    if (!validate(price)) return

    // Only what the user changed is sent, so saving never rewrites a field they did not touch.
    const changed = (key: keyof EditCustomerForm) => form[key] !== initialForm[key]
    const planId = property.primaryPlanId ?? null
    const planFields: { price?: number; cleanMethod?: string; paymentMethod?: PaymentMethod } = {}
    if (!servicesMode && changed('price')) planFields.price = price
    if (changed('cleanMethod') && form.cleanMethod) planFields.cleanMethod = toApiCleanMethod(form.cleanMethod)
    if (changed('paymentMethod') && form.paymentMethod) planFields.paymentMethod = form.paymentMethod
    const frequencyChanged = changed('frequency')

    const customerFields: Record<string, unknown> = {}
    if (changed('fullName')) customerFields.name = form.fullName.trim()
    if (changed('phone')) customerFields.phone = form.phone.trim() || null
    if (changed('landline')) customerFields.landline = form.landline.trim() || null
    if (changed('email')) customerFields.email = form.email.trim() || null
    if (changed('streetAddress')) customerFields.addressLine = form.streetAddress.trim()
    if (changed('postcode')) customerFields.postcode = form.postcode.trim()
    if (changed('propertyType')) customerFields.propertyType = toApiPropertyType(form.propertyType)
    if (changed('accessNotes')) customerFields.accessNotes = form.accessNotes.trim() || null
    if (changed('riskNotes')) customerFields.riskNotes = form.riskNotes.trim() || null
    // Without a plan id the customer endpoint applies plan fields to the primary plan itself.
    if (!planId) Object.assign(customerFields, planFields)

    const serviceIds = Object.keys(serviceSel)
    const servicesChanged =
      servicesMode &&
      (serviceIds.length !== Object.keys(initialServiceSel).length ||
        serviceIds.some((id) => initialServiceSel[id] === undefined || Number(initialServiceSel[id]) !== priceOf(id)))

    try {
      if (Object.keys(customerFields).length > 0) {
        await updateCustomer.mutateAsync(customerFields)
      }

      if (planId) {
        const planInput = {
          ...planFields,
          ...(frequencyChanged ? { cleaningFrequency: toApiFrequency(form.frequency) } : {}),
        }
        if (Object.keys(planInput).length > 0) await updatePlan.mutateAsync({ id: planId, input: planInput })
      } else if (frequencyChanged) {
        await updateProperty.mutateAsync({
          id: property.id,
          input: { cleaningFrequency: toApiFrequency(form.frequency) },
        })
      }

      if (servicesChanged) {
        await setServices.mutateAsync({
          id: property.id,
          input: { serviceIds, prices: Object.fromEntries(serviceIds.map((id) => [id, priceOf(id)])) },
        })
      }

      onClose()
      showToast(editCustomerModal.successToast)
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 400) {
        setError(caught.message)
        return
      }
      showToast(errorMessage(caught))
    }
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
      maxWidthClass="max-w-3xl"
      headerClassName="pl-16"
      bodyClassName="space-y-6"
      footer={
        <div className="grid grid-cols-2 gap-3">
          <ModalButton compact variant="secondary" className="w-full" onClick={onClose}>
            {editCustomerModal.actions.cancel}
          </ModalButton>
          <ModalButton
            compact
            variant="primary"
            className="w-full"
            disabled={!canMutate || saving}
            onClick={() => void handleSave()}
          >
            {editCustomerModal.actions.save}
          </ModalButton>
        </div>
      }
    >
      <span className="absolute top-4 left-5 flex h-9 w-9 items-center justify-center rounded-none bg-accent-surface text-accent">
        <DashboardIcon name="user" className="h-5 w-5" />
      </span>

      {error ? (
        <p className="rounded-lg border border-danger/30 bg-danger/5 px-3.5 py-2.5 text-sm text-danger">{error}</p>
      ) : null}

      <ModalSection icon="user" title={editCustomerModal.sections.contactDetails}>
        <Field label={editCustomerModal.fields.fullName} required size="sm" labelWeight="medium">
          <Input
            inputSize="sm"
            value={form.fullName}
            onChange={(event) => updateField('fullName', event.target.value)}
            className={cn(modalInputClass, 'rounded-lg bg-card')}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={editCustomerModal.fields.phone} required size="sm" labelWeight="medium">
            <IconInput
              icon="phone"
              value={form.phone}
              onChange={(event) => updateField('phone', event.target.value)}
              className={cn(modalInputClass, 'rounded-lg bg-card')}
            />
          </Field>
          <Field label={editCustomerModal.fields.landline} size="sm" labelWeight="medium">
            <IconInput
              icon="phone"
              value={form.landline}
              onChange={(event) => updateField('landline', event.target.value)}
              className={cn(modalInputClass, 'rounded-lg bg-card')}
            />
          </Field>
        </div>

        <Field label={editCustomerModal.fields.email} size="sm" labelWeight="medium">
          <IconInput
            icon="mail"
            type="email"
            value={form.email}
            onChange={(event) => updateField('email', event.target.value)}
            className={cn(modalInputClass, 'rounded-lg bg-card')}
          />
        </Field>
      </ModalSection>

      <ModalSection icon="home" title={editCustomerModal.sections.propertyAddress}>
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_9rem]">
          <Field label={editCustomerModal.fields.streetAddress} required size="sm" labelWeight="medium">
            <Input
              inputSize="sm"
              value={form.streetAddress}
              onChange={(event) => updateField('streetAddress', event.target.value)}
              className={cn(modalInputClass, 'rounded-lg bg-card')}
            />
          </Field>
          <Field label={editCustomerModal.fields.postcode} required size="sm" labelWeight="medium">
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
          {servicesMode ? null : (
            <Field label={editCustomerModal.fields.price} size="sm" labelWeight="medium">
              <Input
                inputSize="sm"
                value={form.price}
                onChange={(event) => updateField('price', event.target.value)}
                className={cn(modalInputClass, 'rounded-lg border-accent/25 bg-accent-surface')}
              />
            </Field>
          )}
          <Field label={editCustomerModal.fields.cleanMethod} size="sm" labelWeight="medium">
            <Select
              inputSize="sm"
              value={form.cleanMethod}
              onChange={(event) => updateField('cleanMethod', event.target.value)}
              options={[
                ...(initialForm.cleanMethod ? [] : [{ value: '', label: editCustomerModal.notSet }]),
                ...editCustomerModal.cleanMethodOptions,
              ]}
              className={modalSelectClass}
            />
          </Field>
          <Field label={editCustomerModal.fields.paymentMethod} size="sm" labelWeight="medium">
            <Select
              inputSize="sm"
              value={form.paymentMethod}
              onChange={(event) => updateField('paymentMethod', event.target.value as PaymentMethod)}
              options={[
                ...(initialForm.paymentMethod ? [] : [{ value: '', label: editCustomerModal.notSet }]),
                ...editCustomerModal.paymentMethodOptions,
              ]}
              className={modalSelectClass}
            />
            {notConnectedWarning ? (
              <p role="status" className="mt-1.5 text-xs text-warning-foreground">{notConnectedWarning}</p>
            ) : null}
          </Field>
        </div>
      </ModalSection>

      {servicesMode ? (
        <ModalSection title={editCustomerModal.sections.services}>
          <ul className="space-y-2" aria-label={editCustomerModal.sections.services}>
            {catalogue.map((service) => {
              const id = service.id as string
              const checked = serviceSel[id] !== undefined
              return (
                <li key={id} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2">
                  <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-sm text-foreground">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(event) => toggleService(id, event.target.checked)}
                      className="h-4 w-4 rounded border-border accent-primary"
                    />
                    <span className="truncate">{service.name}</span>
                    <span className="text-muted">(£{service.defaultPrice})</span>
                  </label>
                  {checked ? (
                    <Input
                      inputSize="sm"
                      inputMode="decimal"
                      aria-label={`${service.name} ${editCustomerModal.fields.price}`}
                      value={serviceSel[id]}
                      onChange={(event) => setServiceSel((current) => ({ ...current, [id]: event.target.value }))}
                      className={cn(modalInputClass, 'w-24 rounded-lg')}
                    />
                  ) : null}
                </li>
              )
            })}
          </ul>
          <p className="text-sm font-semibold text-foreground">
            {editCustomerModal.servicesTotal.replace('{total}', servicesTotal.toFixed(2))}
          </p>
        </ModalSection>
      ) : null}

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
