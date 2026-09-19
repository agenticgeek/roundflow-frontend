import type { FormEvent } from 'react'
import { useMemo, useRef, useState } from 'react'
import type { BusinessProfileData } from '@/types/setup-wizard'
import { setupWizardContent } from '@/content/setup-wizard'
import { Field, FieldError, Input, PhoneInput, Select } from '@/components/ui'
import { DaySelector } from '@/components/setup-wizard/DaySelector'
import { BankDetailsFields } from '@/components/setup-wizard/BankDetailsFields'
import { useReportWizardDirty } from '@/features/setup/lib/wizard-dirty'
import { bankDetailsFieldErrors, type BankDetailsFieldErrors } from '@/lib/bank-details'
import { isValidEmail, isValidPhone } from '@/lib/contact'
import { focusFirstInvalid, hasErrors, type FieldErrors } from '@/lib/form-errors'
import { timezoneOptions } from '@/lib/timezones'

interface BusinessProfileStepProps {
  initialValues: BusinessProfileData
  onSubmit: (values: BusinessProfileData) => void
}

type ProfileField = 'businessName' | 'businessPhone' | 'businessEmail' | 'vatRegistered' | 'vatNumber'

/** Letters + digits only, uppercased, capped — for company/VAT registration numbers. */
function filterRegistrationNumber(value: string, maxLength: number): string {
  return value
    .replace(/[^A-Za-z0-9]/g, '')
    .toUpperCase()
    .slice(0, maxLength)
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
  const [errors, setErrors] = useState<FieldErrors<ProfileField>>({})
  const [bankErrors, setBankErrors] = useState<BankDetailsFieldErrors>({})
  const formRef = useRef<HTMLFormElement>(null)
  const timezones = useMemo(() => timezoneOptions(values.timezone), [values.timezone])
  useReportWizardDirty(values, initialValues)

  function updateField<K extends keyof BusinessProfileData>(key: K, value: BusinessProfileData[K]) {
    setErrors((prev) => (prev[key as ProfileField] ? { ...prev, [key]: undefined } : prev))
    if (key === 'bankDetails') setBankErrors({})
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  function validate(): FieldErrors<ProfileField> {
    const next: FieldErrors<ProfileField> = {}
    if (!values.businessName.trim()) next.businessName = validation.fieldRequired

    if (!values.businessPhone.trim()) next.businessPhone = validation.fieldRequired
    else if (!isValidPhone(values.businessPhone)) next.businessPhone = validation.phoneInvalid

    if (!values.businessEmail.trim()) next.businessEmail = validation.fieldRequired
    else if (!isValidEmail(values.businessEmail)) next.businessEmail = validation.emailInvalid

    if (values.vatRegistered === null) next.vatRegistered = validation.vatRequired
    if (values.vatRegistered) {
      const vatNumber = values.vatNumber.trim()
      if (!vatNumber) next.vatNumber = validation.vatNumberRequired
      else if (vatNumber.length < 5) next.vatNumber = validation.vatNumberInvalid
    }
    return next
  }

  /** Re-checks a single field when the user leaves it, so mistakes show before Continue. */
  function validateOnBlur(field: ProfileField) {
    const message = validate()[field]
    setErrors((prev) => ({ ...prev, [field]: message }))
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors = validate()
    const nextBankErrors = bankDetailsFieldErrors(values.bankDetails)
    setErrors(nextErrors)
    setBankErrors(nextBankErrors)

    if (hasErrors(nextErrors) || hasErrors(nextBankErrors)) {
      focusFirstInvalid(formRef.current)
      return
    }

    onSubmit(values)
  }

  return (
    <form
      ref={formRef}
      id="setup-wizard-step-form"
      onSubmit={handleSubmit}
      noValidate
      className="space-y-6"
    >
      <div className="flex items-start gap-4 border-b border-border pb-6">
        <BusinessProfileIcon />
        <div>
          <h2 className="text-xl font-semibold text-foreground">{businessProfile.heading}</h2>
          <p className="mt-1 text-sm text-muted">{businessProfile.subheading}</p>
        </div>
      </div>

      <Field
        label={fields.businessName.label}
        required={fields.businessName.required}
        labelWeight="medium"
        error={errors.businessName}
      >
        <Input
          value={values.businessName}
          aria-invalid={Boolean(errors.businessName)}
          onBlur={() => errors.businessName && validateOnBlur('businessName')}
          onChange={(e) => updateField('businessName', e.target.value)}
          placeholder={fields.businessName.placeholder}
          autoComplete="organization"
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label={fields.businessPhone.label}
          required={fields.businessPhone.required}
          labelWeight="medium"
          error={errors.businessPhone}
        >
          <PhoneInput
            value={values.businessPhone}
            aria-invalid={Boolean(errors.businessPhone)}
            onBlur={() => values.businessPhone.trim() && validateOnBlur('businessPhone')}
            onValueChange={(value) => updateField('businessPhone', value)}
            placeholder={fields.businessPhone.placeholder}
          />
        </Field>

        <Field
          label={fields.businessEmail.label}
          required={fields.businessEmail.required}
          labelWeight="medium"
          error={errors.businessEmail}
        >
          <Input
            type="email"
            value={values.businessEmail}
            aria-invalid={Boolean(errors.businessEmail)}
            onBlur={() => values.businessEmail.trim() && validateOnBlur('businessEmail')}
            onChange={(e) => updateField('businessEmail', e.target.value)}
            placeholder={fields.businessEmail.placeholder}
            autoComplete="email"
          />
        </Field>
      </div>

      <Field label={fields.companyNumber.label} labelWeight="medium">
        <Input
          value={values.companyNumber}
          onChange={(e) =>
            updateField('companyNumber', filterRegistrationNumber(e.target.value, 15))
          }
          placeholder={fields.companyNumber.placeholder}
        />
      </Field>

      <div>
        <span className="mb-3 block text-sm font-medium text-foreground">
          {fields.vatRegistered.label}
          <span className="text-danger"> *</span>
        </span>
        <div className="flex items-center gap-6">
          {([
            { label: fields.vatRegistered.yes, value: true },
            { label: fields.vatRegistered.no, value: false },
          ] as const).map((option) => (
            <label key={option.label} className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                aria-invalid={Boolean(errors.vatRegistered) && option.value === true}
                checked={values.vatRegistered === option.value}
                onChange={() => {
                  updateField('vatRegistered', option.value)
                  if (!option.value) updateField('vatNumber', '')
                }}
                className="h-4 w-4 rounded border-border accent-foreground"
              />
              {option.label}
            </label>
          ))}
        </div>
        {errors.vatRegistered ? <FieldError message={errors.vatRegistered} /> : null}
      </div>

      {values.vatRegistered ? (
        <Field label={fields.vatNumber.label} required labelWeight="medium" error={errors.vatNumber}>
          <Input
            aria-invalid={Boolean(errors.vatNumber)}
            value={values.vatNumber}
            onChange={(e) => updateField('vatNumber', filterRegistrationNumber(e.target.value, 12))}
            placeholder={fields.vatNumber.placeholder}
          />
        </Field>
      ) : null}

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
            options={timezones}
            searchable
            searchPlaceholder={businessProfile.timezoneSearch}
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

      <div className="border-t border-border pt-6">
        <BankDetailsFields
          values={values.bankDetails}
          onChange={(bankDetails) => updateField('bankDetails', bankDetails)}
          fieldErrors={bankErrors}
        />
      </div>
    </form>
  )
}
