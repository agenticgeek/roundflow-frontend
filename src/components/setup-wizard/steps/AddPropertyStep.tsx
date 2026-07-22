import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'
import type { AddPropertyData, PropertyDraft, PropertyRecord } from '@/types/setup-wizard'
import { setupWizardContent } from '@/content/setup-wizard'
import type { SelectOption } from '@/content/setup-wizard'
import { PropertyClipboardIcon } from '@/components/setup-wizard/PropertyClipboardIcon'
import { SegmentCardGroup } from '@/components/setup-wizard/SegmentCardGroup'
import { SetupStepHeader } from '@/components/setup-wizard/SetupStepHeader'
import { SubStepFooter } from '@/components/setup-wizard/SubStepFooter'
import { VerticalSubStepper } from '@/components/setup-wizard/VerticalSubStepper'
import { Field, FieldError, Input, Select } from '@/components/ui'
import { cn } from '@/lib/utils'

interface AddPropertyStepProps {
  initialValues: AddPropertyData
  serviceAreaOptions: SelectOption[]
  roundOptions: SelectOption[]
  serviceOptions?: SelectOption[]
  adding?: boolean
  onAddProperty: (draft: PropertyDraft) => Promise<void> | void
  onSubmit: () => void
}

function SectionHeading({ children }: { children: string }) {
  return <h3 className="text-sm font-medium text-foreground">{children}</h3>
}

function LabelWithHint({
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
  adding = false,
  onAddProperty,
  onSubmit,
}: AddPropertyStepProps) {
  const { addProperty: addPropertyContent } = setupWizardContent
  const { subSteps, sections, fields, validation, draftDefaults } = addPropertyContent

  const [properties, setProperties] = useState<PropertyRecord[]>(initialValues.properties)
  const [draft, setDraft] = useState<PropertyDraft>({ ...draftDefaults })
  const [subStep, setSubStep] = useState(0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setProperties(initialValues.properties)
  }, [initialValues.properties])

  const currentMeta = subSteps[subStep]

  function updateDraft<K extends keyof PropertyDraft>(key: K, value: PropertyDraft[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }))
    if (error) setError(null)
  }

  function resetDraft() {
    setDraft({ ...draftDefaults })
    setSubStep(0)
    setError(null)
  }

  function validateSubStep(): boolean {
    if (subStep === 0 && !draft.customerName.trim()) {
      setError(validation.customerNameRequired)
      return false
    }
    if (subStep === 0 && !draft.fullAddress.trim()) {
      setError(validation.fullAddressRequired)
      return false
    }
    if (subStep === 0 && !draft.postcode.trim()) {
      setError(validation.postcodeRequired)
      return false
    }
    if (subStep === 1) {
      const price = Number(String(draft.pricePerVisit).replace(/[^0-9.]/g, ''))
      if (!Number.isFinite(price) || price <= 0) {
        setError(validation.priceRequired)
        return false
      }
    }
    if (subStep === 4 && !draft.round) {
      setError(validation.roundRequired)
      return false
    }
    return true
  }

  function handleSubContinue() {
    if (!validateSubStep()) return
    setSubStep((index) => Math.min(index + 1, subSteps.length - 1))
  }

  function handleSubBack() {
    setError(null)
    setSubStep((index) => Math.max(index - 1, 0))
  }

  async function saveProperty() {
    if (!validateSubStep() || adding) return
    try {
      await onAddProperty(draft)
      resetDraft()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add property.')
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSubmit()
  }

  const addPropertyButton = (
    <button
      type="button"
      onClick={resetDraft}
      className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-all duration-200 hover:opacity-90 active:scale-[0.98]"
    >
      <span aria-hidden="true">+</span>
      {addPropertyContent.addProperty}
    </button>
  )

  return (
    <form id="setup-wizard-step-form" onSubmit={handleSubmit} noValidate className="space-y-5">
      <div className="flex gap-6 lg:gap-8">
        <VerticalSubStepper steps={subSteps} currentIndex={subStep} />

        <div className="min-w-0 flex-1">
          <SetupStepHeader
            icon={<PropertyClipboardIcon />}
            title={currentMeta.title}
            subtitle={currentMeta.subtitle}
            action={subStep === 0 ? addPropertyButton : undefined}
          />

          <div className="space-y-5">
            {subStep === 0 ? (
              <PropertyDetailsPanel
                draft={draft}
                sections={sections}
                fields={fields}
                serviceAreaOptions={serviceAreaOptions}
                propertyTypes={addPropertyContent.propertyTypes}
                onChange={updateDraft}
              />
            ) : null}

            {subStep === 1 ? (
              <ServicePlanPanel
                draft={draft}
                fields={fields}
                frequencies={addPropertyContent.cleaningFrequencies}
                vatOptions={addPropertyContent.vatOptions}
                paymentMethods={addPropertyContent.paymentMethods}
                serviceOptions={serviceOptions}
                onChange={updateDraft}
              />
            ) : null}

            {subStep === 2 ? (
              <SchedulingPanel
                draft={draft}
                fields={fields}
                preferredDays={addPropertyContent.preferredDays}
                onChange={updateDraft}
              />
            ) : null}

            {subStep === 3 ? (
              <RiskNotesPanel draft={draft} fields={fields} onChange={updateDraft} />
            ) : null}

            {subStep === 4 ? (
              <AssignPropertyPanel
                draft={draft}
                fields={fields}
                roundOptions={[{ value: '', label: fields.round.placeholder }, ...roundOptions]}
                serviceAreaOptions={[
                  { value: '', label: fields.assignServiceArea.placeholder },
                  ...serviceAreaOptions,
                ]}
                onChange={updateDraft}
              />
            ) : null}

            {error ? <FieldError message={error} size="sm" /> : null}
          </div>

          <SubStepFooter
            currentStep={subStep + 1}
            totalSteps={subSteps.length}
            isFirstStep={subStep === 0}
            onBack={handleSubBack}
            onContinue={subStep === subSteps.length - 1 ? () => void saveProperty() : handleSubContinue}
            continueLabel={
              subStep === subSteps.length - 1
                ? adding
                  ? 'Saving…'
                  : addPropertyContent.actions.addProperty
                : undefined
            }
          />
        </div>
      </div>

      {properties.length > 0 ? (
        <ul className="grid gap-3 border-t border-border pt-5 sm:grid-cols-2 xl:grid-cols-3">
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
      ) : null}
    </form>
  )
}

function PropertyDetailsPanel({
  draft,
  sections,
  fields,
  serviceAreaOptions,
  propertyTypes,
  onChange,
}: {
  draft: PropertyDraft
  sections: { customerProperty: string; address: string }
  fields: (typeof setupWizardContent)['addProperty']['fields']
  serviceAreaOptions: SelectOption[]
  propertyTypes: SelectOption[]
  onChange: <K extends keyof PropertyDraft>(key: K, value: PropertyDraft[K]) => void
}) {
  return (
    <>
      <SectionHeading>{sections.customerProperty}</SectionHeading>
      <div className="space-y-4">
        <Field label={fields.customerName.label} labelWeight="medium" size="sm">
          <Input
            inputSize="sm"
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
          <Field label={fields.phone.label} labelWeight="medium" size="sm">
            <Input
              inputSize="sm"
              type="tel"
              value={draft.phone}
              onChange={(e) => onChange('phone', e.target.value)}
              placeholder={fields.phone.placeholder}
            />
          </Field>
          <Field
            label={<LabelWithHint label={fields.email.label} hint={fields.email.optional} />}
            labelWeight="medium"
            size="sm"
          >
            <Input
              inputSize="sm"
              type="email"
              value={draft.email}
              onChange={(e) => onChange('email', e.target.value)}
              placeholder={fields.email.placeholder}
            />
          </Field>
        </div>
      </div>

      <SectionHeading>{sections.address}</SectionHeading>
      <div className="space-y-4">
        <Field label={fields.fullAddress.label} labelWeight="medium" size="sm">
          <Input
            inputSize="sm"
            value={draft.fullAddress}
            onChange={(e) => onChange('fullAddress', e.target.value)}
            placeholder={fields.fullAddress.placeholder}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={fields.postcode.label} labelWeight="medium" size="sm">
            <Input
              inputSize="sm"
              value={draft.postcode}
              onChange={(e) => onChange('postcode', e.target.value)}
              placeholder={fields.postcode.placeholder}
            />
          </Field>
          <Field label={fields.serviceArea.label} labelWeight="medium" size="sm">
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

function ServicePlanPanel({
  draft,
  fields,
  frequencies,
  vatOptions,
  paymentMethods,
  serviceOptions,
  onChange,
}: {
  draft: PropertyDraft
  fields: (typeof setupWizardContent)['addProperty']['fields']
  frequencies: SelectOption[]
  vatOptions: SelectOption[]
  paymentMethods: SelectOption[]
  serviceOptions: SelectOption[]
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
      <Field label={fields.pricePerVisit.label} labelWeight="medium" size="sm">
        <Input
          inputSize="sm"
          value={draft.pricePerVisit}
          onChange={(e) => onChange('pricePerVisit', e.target.value)}
          placeholder={fields.pricePerVisit.placeholder}
        />
      </Field>
      {serviceOptions.length > 0 ? (
        <Field label="Service" labelWeight="medium" size="sm">
          <Select
            inputSize="sm"
            value={draft.serviceId}
            onChange={(e) => onChange('serviceId', e.target.value)}
            options={[{ value: '', label: 'Select service' }, ...serviceOptions]}
          />
        </Field>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={fields.vat.label} labelWeight="medium" size="sm">
          <Select
            inputSize="sm"
            value={draft.vat}
            onChange={(e) => onChange('vat', e.target.value)}
            options={vatOptions}
          />
        </Field>
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

function SchedulingPanel({
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
        />
      </Field>
    </div>
  )
}

function RiskNotesPanel({
  draft,
  fields,
  onChange,
}: {
  draft: PropertyDraft
  fields: (typeof setupWizardContent)['addProperty']['fields']
  onChange: <K extends keyof PropertyDraft>(key: K, value: PropertyDraft[K]) => void
}) {
  return (
    <div className="space-y-4">
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
  onChange,
}: {
  draft: PropertyDraft
  fields: (typeof setupWizardContent)['addProperty']['fields']
  roundOptions: SelectOption[]
  serviceAreaOptions: SelectOption[]
  onChange: <K extends keyof PropertyDraft>(key: K, value: PropertyDraft[K]) => void
}) {
  return (
    <div className="space-y-4">
      <Field label={fields.round.label} labelWeight="medium" size="sm">
        <Select
          inputSize="sm"
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
