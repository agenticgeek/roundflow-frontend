import type { FormEvent } from 'react'
import { useEffect, useRef, useState } from 'react'
import type { AddPropertyData, PropertyDraft, PropertyRecord } from '@/types/setup-wizard'
import { setupWizardContent } from '@/content/setup-wizard'
import type { SelectOption } from '@/content/setup-wizard'
import { PropertyClipboardIcon } from '@/components/setup-wizard/PropertyClipboardIcon'
import { SegmentCardGroup } from '@/components/setup-wizard/SegmentCardGroup'
import { SetupStepHeader } from '@/components/setup-wizard/SetupStepHeader'
import { SubStepFooter } from '@/components/setup-wizard/SubStepFooter'
import { VerticalSubStepper } from '@/components/setup-wizard/VerticalSubStepper'
import { Field, FieldError, Input, PhoneInput, Select } from '@/components/ui'
import { isValidEmail, isValidPhone } from '@/lib/contact'
import { focusFirstInvalid, hasErrors } from '@/lib/form-errors'
import { isValidUkPostcode } from '@/lib/postcode'
import { cn } from '@/lib/utils'

export type PropertyDraftErrors = Partial<Record<keyof PropertyDraft, string>>

/**
 * The wizard's POST /setup/step/9 has no scheduling, customer-notes or VAT fields,
 * so those inputs are left out here (the standalone Add Property modal keeps them,
 * where its API does save them). Visit timing in setup comes from the round's
 * default day + frequency (step 8) and the first-cycle start date (step 11).
 */
const WIZARD_SUB_STEPS = ['details', 'plan', 'risk', 'assign'] as const
type WizardSubStep = (typeof WIZARD_SUB_STEPS)[number]
const CONTENT_SUB_STEP_INDEX: Record<WizardSubStep, number> = { details: 0, plan: 1, risk: 3, assign: 4 }

interface AddPropertyStepProps {
  initialValues: AddPropertyData
  serviceAreaOptions: SelectOption[]
  roundOptions: SelectOption[]
  serviceOptions?: SelectOption[]
  /** Catalogue default price per service id — prefills "Price per visit". */
  servicePrices?: Readonly<Record<string, number>>
  adding?: boolean
  onAddProperty: (draft: PropertyDraft) => Promise<void> | void
  onSubmit: () => void
}

export function SectionHeading({ children }: { children: string }) {
  return <h3 className="text-sm font-medium text-foreground">{children}</h3>
}

export function LabelWithHint({
  label,
  hint,
  hintClassName,
}: {
  label: string
  hint?: string
  hintClassName?: string
}) {
  return (
    <>
      {label}
      {hint ? (
        <>
          {' '}
          <span className={cn('font-normal', hintClassName ?? 'text-muted')}>{hint}</span>
        </>
      ) : null}
    </>
  )
}

export function AddPropertyStep({
  initialValues,
  serviceAreaOptions,
  roundOptions,
  serviceOptions = [],
  servicePrices = {},
  adding = false,
  onAddProperty,
  onSubmit,
}: AddPropertyStepProps) {
  const { addProperty: addPropertyContent } = setupWizardContent
  const { subSteps, sections, fields, validation, draftDefaults } = addPropertyContent

  const [properties, setProperties] = useState<PropertyRecord[]>(initialValues.properties)
  const [draft, setDraft] = useState<PropertyDraft>({ ...draftDefaults })
  const [subStepIndex, setSubStepIndex] = useState(0)
  const [errors, setErrors] = useState<PropertyDraftErrors>({})
  const [saveError, setSaveError] = useState<string | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setProperties(initialValues.properties)
  }, [initialValues.properties])

  const subStep = WIZARD_SUB_STEPS[subStepIndex]!
  const stepperSteps = WIZARD_SUB_STEPS.map((key, index) => ({
    ...subSteps[CONTENT_SUB_STEP_INDEX[key]]!,
    label: String(index + 1).padStart(2, '0'),
  }))
  const currentMeta = stepperSteps[subStepIndex]!
  const isLastSubStep = subStepIndex === WIZARD_SUB_STEPS.length - 1

  function updateDraft<K extends keyof PropertyDraft>(key: K, value: PropertyDraft[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev))
    setSaveError(null)
  }

  function resetDraft() {
    setDraft({ ...draftDefaults })
    setSubStepIndex(0)
    setErrors({})
    setSaveError(null)
  }

  function subStepErrors(): PropertyDraftErrors {
    const next: PropertyDraftErrors = {}
    if (subStep === 'details') {
      if (!draft.customerName.trim()) next.customerName = validation.customerNameRequired
      if (!draft.phone.trim()) next.phone = validation.phoneRequired
      else if (!isValidPhone(draft.phone)) next.phone = validation.phoneInvalid
      if (draft.landline.trim() && !isValidPhone(draft.landline)) next.landline = validation.landlineInvalid
      if (draft.email.trim() && !isValidEmail(draft.email)) next.email = validation.emailInvalid
      if (!draft.fullAddress.trim()) next.fullAddress = validation.fullAddressRequired
      if (!draft.postcode.trim()) next.postcode = validation.postcodeRequired
      else if (!isValidUkPostcode(draft.postcode)) next.postcode = validation.postcodeInvalid
    }
    if (subStep === 'plan') {
      const price = Number(String(draft.pricePerVisit).replace(/[^0-9.]/g, ''))
      if (!Number.isFinite(price) || price <= 0) next.pricePerVisit = validation.priceRequired
    }
    if (subStep === 'assign' && !draft.round) next.round = validation.roundRequired
    return next
  }

  function validateSubStep(): boolean {
    const next = subStepErrors()
    setErrors(next)
    if (hasErrors(next)) {
      focusFirstInvalid(panelRef.current)
      return false
    }
    return true
  }

  function handleSubContinue() {
    if (!validateSubStep()) return
    setSubStepIndex((index) => Math.min(index + 1, WIZARD_SUB_STEPS.length - 1))
  }

  function handleSubBack() {
    setErrors({})
    setSaveError(null)
    setSubStepIndex((index) => Math.max(index - 1, 0))
  }

  async function saveProperty() {
    if (!validateSubStep() || adding) return
    try {
      await onAddProperty(draft)
      resetDraft()
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Could not add property.')
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSubmit()
  }

  return (
    <form id="setup-wizard-step-form" onSubmit={handleSubmit} noValidate className="space-y-5">
      <div className="flex gap-6 lg:gap-8">
        <VerticalSubStepper steps={stepperSteps} currentIndex={subStepIndex} />

        <div ref={panelRef} className="min-w-0 flex-1">
          <SetupStepHeader
            icon={<PropertyClipboardIcon />}
            title={currentMeta.title}
            subtitle={currentMeta.subtitle}
          />

          <div className="space-y-5">
            {subStep === 'details' ? (
              <PropertyDetailsPanel
                draft={draft}
                sections={sections}
                fields={fields}
                serviceAreaOptions={serviceAreaOptions}
                propertyTypes={addPropertyContent.propertyTypes}
                errors={errors}
                onChange={updateDraft}
              />
            ) : null}

            {subStep === 'plan' ? (
              <ServicePlanPanel
                draft={draft}
                fields={fields}
                frequencies={addPropertyContent.cleaningFrequencies}
                vatOptions={addPropertyContent.vatOptions}
                paymentMethods={addPropertyContent.paymentMethods}
                serviceOptions={serviceOptions}
                servicePrices={servicePrices}
                showVat={false}
                errors={errors}
                onChange={updateDraft}
              />
            ) : null}

            {subStep === 'risk' ? (
              <RiskNotesPanel draft={draft} fields={fields} showCustomerNotes={false} onChange={updateDraft} />
            ) : null}

            {subStep === 'assign' ? (
              <AssignPropertyPanel
                draft={draft}
                fields={fields}
                roundOptions={[{ value: '', label: fields.round.placeholder }, ...roundOptions]}
                serviceAreaOptions={[
                  { value: '', label: fields.assignServiceArea.placeholder },
                  ...serviceAreaOptions,
                ]}
                errors={errors}
                onChange={updateDraft}
              />
            ) : null}

            {saveError ? <FieldError message={saveError} size="sm" /> : null}
          </div>

          <SubStepFooter
            currentStep={subStepIndex + 1}
            totalSteps={WIZARD_SUB_STEPS.length}
            isFirstStep={subStepIndex === 0}
            onBack={handleSubBack}
            onContinue={isLastSubStep ? () => void saveProperty() : handleSubContinue}
            continueLabel={
              isLastSubStep ? (adding ? 'Saving…' : addPropertyContent.actions.addProperty) : undefined
            }
            loading={isLastSubStep && adding}
          />
        </div>
      </div>

      {properties.length > 0 ? (
        <div className="border-t border-border pt-5">
          <h3 className="mb-3 text-sm font-medium text-foreground">
            {addPropertyContent.addedTitle} ({properties.length})
          </h3>
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {properties.map((property) => (
              <li
                key={property.id}
                className="rounded-lg border border-border bg-background p-3 shadow-sm"
              >
                <p className="text-sm font-medium text-foreground">{property.propertyName}</p>
                <p className="mt-0.5 text-xs text-muted">{property.fullAddress || property.customerName}</p>
                {property.round ? (
                  <p className="mt-1.5 text-xs font-medium text-primary">
                    {roundOptions.find((option) => option.value === property.round)?.label ??
                      property.round}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </form>
  )
}

export function PropertyDetailsPanel({
  draft,
  sections,
  fields,
  serviceAreaOptions,
  propertyTypes,
  serviceAreaRequired = false,
  errors = {},
  onChange,
}: {
  draft: PropertyDraft
  sections: { customerProperty: string; address: string }
  fields: (typeof setupWizardContent)['addProperty']['fields']
  serviceAreaOptions: SelectOption[]
  propertyTypes: SelectOption[]
  /** Some callers (e.g. the standalone Add Property modal) require this against the live API. */
  serviceAreaRequired?: boolean
  errors?: PropertyDraftErrors
  onChange: <K extends keyof PropertyDraft>(key: K, value: PropertyDraft[K]) => void
}) {
  return (
    <>
      <SectionHeading>{sections.customerProperty}</SectionHeading>
      <div className="space-y-4">
        <Field label={fields.customerName.label} required labelWeight="medium" size="sm" error={errors.customerName}>
          <Input
            inputSize="sm"
            aria-invalid={Boolean(errors.customerName)}
            value={draft.customerName}
            onChange={(e) => onChange('customerName', e.target.value)}
            placeholder={fields.customerName.placeholder}
          />
        </Field>
        <Field
          label={
            <LabelWithHint
              label={fields.propertyName.label}
              hint={fields.propertyName.optional}
            />
          }
          labelWeight="medium"
          size="sm"
        >
          <Input
            inputSize="sm"
            value={draft.propertyName}
            onChange={(e) => onChange('propertyName', e.target.value)}
            placeholder={fields.propertyName.placeholder}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={fields.phone.label} required labelWeight="medium" size="sm" error={errors.phone}>
            <PhoneInput
              inputSize="sm"
              aria-invalid={Boolean(errors.phone)}
              value={draft.phone}
              onValueChange={(value) => onChange('phone', value)}
              placeholder={fields.phone.placeholder}
            />
          </Field>
          <Field
            label={<LabelWithHint label={fields.landline.label} hint={fields.landline.optional} />}
            labelWeight="medium"
            size="sm"
            error={errors.landline}
          >
            <PhoneInput
              inputSize="sm"
              aria-invalid={Boolean(errors.landline)}
              value={draft.landline}
              onValueChange={(value) => onChange('landline', value)}
              placeholder={fields.landline.placeholder}
            />
          </Field>
        </div>
        <Field
          label={<LabelWithHint label={fields.email.label} hint={fields.email.optional} />}
          labelWeight="medium"
          size="sm"
          error={errors.email}
        >
          <Input
            inputSize="sm"
            aria-invalid={Boolean(errors.email)}
            type="email"
            value={draft.email}
            onChange={(e) => onChange('email', e.target.value)}
            placeholder={fields.email.placeholder}
          />
        </Field>
      </div>

      <SectionHeading>{sections.address}</SectionHeading>
      <div className="space-y-4">
        <Field label={fields.fullAddress.label} required labelWeight="medium" size="sm" error={errors.fullAddress}>
          <Input
            inputSize="sm"
            aria-invalid={Boolean(errors.fullAddress)}
            value={draft.fullAddress}
            onChange={(e) => onChange('fullAddress', e.target.value)}
            placeholder={fields.fullAddress.placeholder}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={fields.postcode.label} required labelWeight="medium" size="sm" error={errors.postcode}>
            <Input
              inputSize="sm"
              aria-invalid={Boolean(errors.postcode)}
              value={draft.postcode}
              onChange={(e) => onChange('postcode', e.target.value)}
              placeholder={fields.postcode.placeholder}
            />
          </Field>
          <Field
            label={fields.serviceArea.label}
            required={serviceAreaRequired}
            labelWeight="medium"
            size="sm"
          >
            <Select
              inputSize="sm"
              value={draft.serviceArea}
              onChange={(e) => onChange('serviceArea', e.target.value)}
              options={[{ value: '', label: fields.serviceArea.placeholder }, ...serviceAreaOptions]}
            />
          </Field>
        </div>
        <Field label={fields.propertyType.label} labelWeight="medium" size="sm">
          <Select
            inputSize="sm"
            value={draft.propertyType}
            onChange={(e) => onChange('propertyType', e.target.value)}
            options={propertyTypes}
          />
        </Field>
      </div>
    </>
  )
}

export function ServicePlanPanel({
  draft,
  fields,
  frequencies,
  vatOptions,
  paymentMethods,
  serviceOptions,
  servicePrices = {},
  showVat = true,
  errors = {},
  onChange,
}: {
  draft: PropertyDraft
  fields: (typeof setupWizardContent)['addProperty']['fields']
  frequencies: SelectOption[]
  vatOptions: SelectOption[]
  paymentMethods: SelectOption[]
  serviceOptions: SelectOption[]
  /** Catalogue default price per service id — prefills the price when a service is picked. */
  servicePrices?: Readonly<Record<string, number>>
  showVat?: boolean
  errors?: PropertyDraftErrors
  onChange: <K extends keyof PropertyDraft>(key: K, value: PropertyDraft[K]) => void
}) {
  return (
    <div className="space-y-5">
      <div>
        <span className="mb-2.5 block text-sm font-medium text-foreground">
          {fields.cleaningFrequency.label}
        </span>
        <SegmentCardGroup
          ariaLabel={fields.cleaningFrequency.label}
          options={frequencies.map((option) => ({ id: option.value, label: option.label }))}
          value={draft.cleaningFrequency}
          onChange={(value) => onChange('cleaningFrequency', value)}
        />
      </div>
      {serviceOptions.length > 0 ? (
        <Field label="Service" labelWeight="medium" size="sm">
          <Select
            inputSize="sm"
            value={draft.serviceId}
            onChange={(e) => {
              const nextId = e.target.value
              const previousDefault = servicePrices[draft.serviceId]
              const nextDefault = servicePrices[nextId]
              onChange('serviceId', nextId)
              // Prefill from the catalogue unless the user already typed their own price.
              const untouched =
                !String(draft.pricePerVisit).trim() ||
                (previousDefault != null && Number(draft.pricePerVisit) === previousDefault)
              if (nextDefault != null && untouched) onChange('pricePerVisit', String(nextDefault))
            }}
            options={[{ value: '', label: 'Select service' }, ...serviceOptions]}
          />
        </Field>
      ) : null}
      <Field label={fields.pricePerVisit.label} required labelWeight="medium" size="sm" error={errors.pricePerVisit}>
        <Input
          inputSize="sm"
          inputMode="decimal"
          aria-invalid={Boolean(errors.pricePerVisit)}
          value={draft.pricePerVisit}
          onChange={(e) => onChange('pricePerVisit', e.target.value)}
          placeholder={fields.pricePerVisit.placeholder}
        />
        {Object.keys(servicePrices).length > 0 ? (
          <p className="mt-1.5 text-xs text-muted">{fields.pricePerVisit.hint}</p>
        ) : null}
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        {showVat ? (
          <Field label={fields.vat.label} labelWeight="medium" size="sm">
            <Select
              inputSize="sm"
              value={draft.vat}
              onChange={(e) => onChange('vat', e.target.value)}
              options={vatOptions}
            />
          </Field>
        ) : null}
        <Field label={fields.paymentMethod.label} labelWeight="medium" size="sm">
          <Select
            inputSize="sm"
            value={draft.paymentMethod}
            onChange={(e) => onChange('paymentMethod', e.target.value)}
            options={paymentMethods}
          />
        </Field>
      </div>
    </div>
  )
}

export function SchedulingPanel({
  draft,
  fields,
  preferredDays,
  onChange,
}: {
  draft: PropertyDraft
  fields: (typeof setupWizardContent)['addProperty']['fields']
  preferredDays: SelectOption[]
  onChange: <K extends keyof PropertyDraft>(key: K, value: PropertyDraft[K]) => void
}) {
  return (
    <div className="space-y-4">
      <Field label={fields.startDate.label} labelWeight="medium" size="sm">
        <Input
          inputSize="sm"
          type="date"
          value={draft.startDate}
          onChange={(e) => onChange('startDate', e.target.value)}
          placeholder={fields.startDate.placeholder}
        />
      </Field>
      <Field
        label={<LabelWithHint label={fields.preferredDay.label} hint={fields.preferredDay.optional} />}
        labelWeight="medium"
        size="sm"
      >
        <Select
          inputSize="sm"
          value={draft.preferredDay}
          onChange={(e) => onChange('preferredDay', e.target.value)}
          options={preferredDays}
        />
      </Field>
      <Field
        label={<LabelWithHint label={fields.nextVisitDate.label} hint={fields.nextVisitDate.optional} />}
        labelWeight="medium"
        size="sm"
      >
        <Input
          inputSize="sm"
          type="date"
          value={draft.nextVisitDate}
          onChange={(e) => onChange('nextVisitDate', e.target.value)}
          placeholder={fields.nextVisitDate.placeholder}
          min={draft.startDate || undefined}
        />
      </Field>
    </div>
  )
}

export function RiskNotesPanel({
  draft,
  fields,
  showCustomerNotes = true,
  onChange,
}: {
  draft: PropertyDraft
  fields: (typeof setupWizardContent)['addProperty']['fields']
  showCustomerNotes?: boolean
  onChange: <K extends keyof PropertyDraft>(key: K, value: PropertyDraft[K]) => void
}) {
  return (
    <div className="space-y-4">
      {showCustomerNotes ? (
        <Field
          label={<LabelWithHint label={fields.customerNotes.label} hint={fields.customerNotes.hint} />}
          labelWeight="medium"
          size="sm"
        >
          <Input
            inputSize="sm"
            value={draft.customerNotes}
            onChange={(e) => onChange('customerNotes', e.target.value)}
            placeholder={fields.customerNotes.placeholder}
          />
        </Field>
      ) : null}
      <Field
        label={
          <LabelWithHint
            label={fields.riskNotes.label}
            hint={fields.riskNotes.hint}
            hintClassName="text-danger"
          />
        }
        labelWeight="medium"
        size="sm"
      >
        <Input
          inputSize="sm"
          value={draft.riskNotes}
          onChange={(e) => onChange('riskNotes', e.target.value)}
          placeholder={fields.riskNotes.placeholder}
        />
      </Field>
      <Field label={fields.accessNotes.label} labelWeight="medium" size="sm">
        <Input
          inputSize="sm"
          value={draft.accessNotes}
          onChange={(e) => onChange('accessNotes', e.target.value)}
          placeholder={fields.accessNotes.placeholder}
        />
      </Field>
    </div>
  )
}

function AssignPropertyPanel({
  draft,
  fields,
  roundOptions,
  serviceAreaOptions,
  errors = {},
  onChange,
}: {
  draft: PropertyDraft
  fields: (typeof setupWizardContent)['addProperty']['fields']
  roundOptions: SelectOption[]
  serviceAreaOptions: SelectOption[]
  errors?: PropertyDraftErrors
  onChange: <K extends keyof PropertyDraft>(key: K, value: PropertyDraft[K]) => void
}) {
  return (
    <div className="space-y-4">
      <Field label={fields.round.label} required labelWeight="medium" size="sm" error={errors.round}>
        <Select
          inputSize="sm"
          aria-invalid={Boolean(errors.round)}
          value={draft.round}
          onChange={(e) => onChange('round', e.target.value)}
          options={roundOptions}
        />
      </Field>
      <Field
        label={
          <LabelWithHint
            label={fields.assignServiceArea.label}
            hint={fields.assignServiceArea.hint}
          />
        }
        labelWeight="medium"
        size="sm"
      >
        <Select
          inputSize="sm"
          value={draft.assignServiceArea}
          onChange={(e) => onChange('assignServiceArea', e.target.value)}
          options={serviceAreaOptions}
        />
      </Field>
    </div>
  )
}
