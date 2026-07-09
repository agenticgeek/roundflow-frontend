import type { FormEvent } from 'react'
import { useState } from 'react'
import type { BusinessProfileData } from '@/types/setup-wizard'
import { setupWizardContent } from '@/content/setup-wizard'
import { Field, Input, Select } from '@/components/ui'
import { DaySelector } from '@/components/setup-wizard/DaySelector'
import { cn } from '@/lib/utils'

interface BusinessProfileStepProps {
  initialValues: BusinessProfileData
  onSubmit: (values: BusinessProfileData) => void
}

function BusinessProfileIcon() {
  return (
    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true">
        <path d="M4 21V7.5L12 3l8 4.5V21M9 21v-6h6v6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M9 10h6M9 14h6" strokeLinecap="round" />
      </svg>
    </span>
  )
}

export function BusinessProfileStep({ initialValues, onSubmit }: BusinessProfileStepProps) {
  const { businessProfile, validation } = setupWizardContent
  const { fields } = businessProfile

  const [values, setValues] = useState<BusinessProfileData>(initialValues)
  const [error, setError] = useState<string | null>(null)

  function updateField<K extends keyof BusinessProfileData>(key: K, value: BusinessProfileData[K]) {
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (!values.businessName.trim() || !values.businessPhone.trim() || !values.businessEmail.trim()) {
      setError(validation.required)
      return
    }
    if (values.vatRegistered === null) {
      setError(validation.vatRequired)
      return
    }

    onSubmit(values)
  }

  return (
    <form id="setup-wizard-step-form" onSubmit={handleSubmit} noValidate className="space-y-6">
      <div className="flex items-start gap-4 border-b border-border pb-6">
        <BusinessProfileIcon />
        <div>
          <h2 className="text-xl font-semibold text-foreground">{businessProfile.heading}</h2>
          <p className="mt-1 text-sm text-muted">{businessProfile.subheading}</p>
        </div>
      </div>

      <Field label={fields.businessName.label} required={fields.businessName.required} labelWeight="medium">
        <Input
          value={values.businessName}
          onChange={(e) => updateField('businessName', e.target.value)}
          placeholder={fields.businessName.placeholder}
          autoComplete="organization"
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={fields.businessPhone.label} required={fields.businessPhone.required} labelWeight="medium">
          <Input
            type="tel"
            value={values.businessPhone}
            onChange={(e) => updateField('businessPhone', e.target.value)}
            placeholder={fields.businessPhone.placeholder}
            autoComplete="tel"
          />
        </Field>

        <Field label={fields.businessEmail.label} required={fields.businessEmail.required} labelWeight="medium">
          <Input
            type="email"
            value={values.businessEmail}
            onChange={(e) => updateField('businessEmail', e.target.value)}
            placeholder={fields.businessEmail.placeholder}
            autoComplete="email"
          />
        </Field>
      </div>

      <Field label={fields.serviceArea.label} labelWeight="medium">
        <Input
          value={values.serviceArea}
          onChange={(e) => updateField('serviceArea', e.target.value)}
          placeholder={fields.serviceArea.placeholder}
        />
      </Field>

      <Field label={fields.companyNumber.label} labelWeight="medium">
        <Input
          value={values.companyNumber}
          onChange={(e) => updateField('companyNumber', e.target.value)}
          placeholder={fields.companyNumber.placeholder}
        />
      </Field>

      <Field label={fields.vatNumber.label} labelWeight="medium">
        <Input
          value={values.vatNumber}
          onChange={(e) => updateField('vatNumber', e.target.value)}
          placeholder={fields.vatNumber.placeholder}
        />
      </Field>

      <div>
        <span className="mb-3 block text-sm font-medium text-foreground">{fields.vatRegistered.label}</span>
        <div className="flex items-center gap-6">
          {([
            { label: fields.vatRegistered.yes, value: true },
            { label: fields.vatRegistered.no, value: false },
          ] as const).map((option) => (
            <label key={option.label} className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={values.vatRegistered === option.value}
                onChange={() => updateField('vatRegistered', option.value)}
                className="h-4 w-4 rounded border-border accent-foreground"
              />
              {option.label}
            </label>
          ))}
        </div>
      </div>

      <Field label={fields.workingDays.label} labelWeight="medium">
        <DaySelector
          days={businessProfile.days}
          selected={values.workingDays}
          onChange={(workingDays) => updateField('workingDays', workingDays)}
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={fields.timezone.label} labelWeight="medium">
          <Select
            value={values.timezone}
            onChange={(e) => updateField('timezone', e.target.value)}
            options={businessProfile.timezones}
          />
        </Field>

        <Field label={fields.currency.label} labelWeight="medium">
          <Select
            value={values.currency}
            onChange={(e) => updateField('currency', e.target.value)}
            options={businessProfile.currencies}
          />
        </Field>
      </div>

      {error ? (
        <p role="alert" className={cn('animate-fade-in text-sm text-danger')}>
          {error}
        </p>
      ) : null}
    </form>
  )
}
