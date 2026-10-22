import type { FormEvent, ReactNode } from 'react'
import { useRef, useState } from 'react'
import type { BusinessProfileData } from '@/types/setup-wizard'
import { setupWizardContent } from '@/content/setup-wizard'
import { Field, Input, PhoneInput, Select, Toggle } from '@/components/ui'
import { DaySelector } from '@/components/setup-wizard/DaySelector'
import { BankDetailsFields } from '@/components/setup-wizard/BankDetailsFields'
import { useReportWizardDirty } from '@/features/setup/lib/wizard-dirty'
import { bankDetailsFieldErrors, type BankDetailsFieldErrors } from '@/lib/bank-details'
import { isValidEmail, isValidPhone } from '@/lib/contact'
import { focusFirstInvalid, hasErrors, type FieldErrors } from '@/lib/form-errors'
import { isValidUkPostcode } from '@/lib/postcode'

interface BusinessProfileStepProps {
  initialValues: BusinessProfileData
  onSubmit: (values: BusinessProfileData) => void
}

type ProfileField = 'businessName' | 'businessPhone' | 'businessEmail' | 'postcode' | 'vatNumber'

/** Letters + digits only, uppercased, capped — for company/VAT registration numbers. */
function filterRegistrationNumber(value: string, maxLength: number): string {
  return value
    .replace(/[^A-Za-z0-9]/g, '')
    .toUpperCase()
    .slice(0, maxLength)
}

function BusinessProfileIcon() {
  return (
    <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6" aria-hidden="true">
        <rect x="3" y="7" width="18" height="13" rx="2" />
        <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18" strokeLinecap="round" />
      </svg>
    </span>
  )
}

function LockIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-4 w-4" aria-hidden="true">
      <rect x="4.5" y="9" width="11" height="8" rx="1.5" />
      <path d="M7 9V6.5a3 3 0 0 1 6 0V9" strokeLinecap="round" />
    </svg>
  )
}

/** White card grouping one part of the profile form. */
function ProfileSection({
  heading,
  description,
  children,
}: {
  heading: string
  description?: string
  children: ReactNode
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
      <div className="mb-5">
        <h3 className="text-base font-semibold text-foreground sm:text-lg">{heading}</h3>
        {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
      </div>
      {children}
    </section>
  )
}

/** Read-only field with a lock icon — for settings RoundFlow fixes for every business. */
function LockedInput({ value, label }: { value: string; label: string }) {
  return (
    <div className="relative">
      <Input value={value} aria-label={label} readOnly tabIndex={-1} className="cursor-default bg-surface pr-11" />
      <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-muted">
        <LockIcon />
      </span>
    </div>
  )
}

export function BusinessProfileStep({ initialValues, onSubmit }: BusinessProfileStepProps) {
  const { businessProfile, validation } = setupWizardContent
  const { fields, sections, locale } = businessProfile

  const [values, setValues] = useState<BusinessProfileData>(initialValues)
  const [errors, setErrors] = useState<FieldErrors<ProfileField>>({})
  const [bankErrors, setBankErrors] = useState<BankDetailsFieldErrors>({})
  const formRef = useRef<HTMLFormElement>(null)
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

    if (values.postcode.trim() && !isValidUkPostcode(values.postcode)) {
      next.postcode = fields.postcode.invalid
    }

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

    onSubmit({
      ...values,
      // The toggle has no "unanswered" state — off means not VAT registered.
      vatRegistered: values.vatRegistered ?? false,
      currency: locale.currency,
      timezone: locale.timezone,
    })
  }

  return (
    <form
      ref={formRef}
      id="setup-wizard-step-form"
      onSubmit={handleSubmit}
      noValidate
      className="space-y-6"
    >
      <div className="flex items-start gap-4">
        <BusinessProfileIcon />
        <div className="pt-0.5">
          <h2 className="text-xl font-semibold text-foreground sm:text-2xl">{businessProfile.heading}</h2>
          <p className="mt-1 text-sm text-muted sm:text-base">{businessProfile.subheading}</p>
        </div>
      </div>

      <ProfileSection heading={sections.details.heading}>
        <div className="grid gap-x-5 gap-y-5 sm:grid-cols-2">
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

          <Field label={fields.companyNumber.label} labelWeight="medium">
            <Input
              value={values.companyNumber}
              onChange={(e) =>
                updateField('companyNumber', filterRegistrationNumber(e.target.value, 15))
              }
              placeholder={fields.companyNumber.placeholder}
            />
          </Field>

          <Field label={fields.businessAddress.label} labelWeight="medium">
            <Input
              value={values.businessAddress}
              onChange={(e) => updateField('businessAddress', e.target.value)}
              placeholder={fields.businessAddress.placeholder}
              autoComplete="street-address"
            />
          </Field>

          <Field label={fields.postcode.label} labelWeight="medium" error={errors.postcode}>
            <Input
              value={values.postcode}
              aria-invalid={Boolean(errors.postcode)}
              onBlur={() => values.postcode.trim() && validateOnBlur('postcode')}
              onChange={(e) => updateField('postcode', e.target.value.toUpperCase().slice(0, 8))}
              placeholder={fields.postcode.placeholder}
              autoComplete="postal-code"
            />
          </Field>
        </div>
      </ProfileSection>

      <ProfileSection heading={sections.vat.heading} description={sections.vat.description}>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-foreground sm:text-[15px]">{fields.vatRegistered.label}</p>
            <p className="mt-0.5 text-sm text-muted">{fields.vatRegistered.description}</p>
          </div>
          <Toggle
            checked={values.vatRegistered === true}
            ariaLabel={fields.vatRegistered.label}
            onChange={(checked) => {
              updateField('vatRegistered', checked)
              if (!checked) updateField('vatNumber', '')
            }}
          />
        </div>

        {values.vatRegistered ? (
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <Field label={fields.vatNumber.label} required labelWeight="medium" error={errors.vatNumber}>
              <Input
                aria-invalid={Boolean(errors.vatNumber)}
                value={values.vatNumber}
                onBlur={() => errors.vatNumber && validateOnBlur('vatNumber')}
                onChange={(e) => updateField('vatNumber', filterRegistrationNumber(e.target.value, 12))}
                placeholder={fields.vatNumber.placeholder}
              />
            </Field>

            <Field label={fields.vatRate.label} labelWeight="medium">
              <Select
                value={values.vatRate}
                onChange={(e) => updateField('vatRate', e.target.value)}
                options={businessProfile.vatRates}
              />
            </Field>
          </div>
        ) : null}
      </ProfileSection>

      <ProfileSection heading={sections.workingPattern.heading}>
        <Field label={fields.workingDays.label} labelWeight="medium">
          <DaySelector
            variant="pill"
            days={businessProfile.days}
            selected={values.workingDays}
            onChange={(workingDays) => updateField('workingDays', workingDays)}
          />
          <p className="mt-2.5 text-sm text-muted">{fields.workingDays.hint}</p>
        </Field>

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <Field label={fields.currency.label} labelWeight="medium">
            <LockedInput value={locale.currencyLabel} label={fields.currency.label} />
          </Field>
          <Field label={fields.timezone.label} labelWeight="medium">
            <LockedInput value={locale.timezone} label={fields.timezone.label} />
          </Field>
        </div>
        <p className="mt-2.5 text-sm text-muted">{locale.note}</p>
      </ProfileSection>

      <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <BankDetailsFields
          values={values.bankDetails}
          onChange={(bankDetails) => updateField('bankDetails', bankDetails)}
          fieldErrors={bankErrors}
        />
      </section>
    </form>
  )
}
