import type { BankDetailsForm } from '@/types/setup-wizard'
import { setupWizardContent } from '@/content/setup-wizard'
import { Field, FieldError, Input } from '@/components/ui'
import { formatSortCode, stripSpaces, type BankDetailsFieldErrors } from '@/lib/bank-details'

interface BankDetailsFieldsProps {
  values: BankDetailsForm
  onChange: (values: BankDetailsForm) => void
  disabled?: boolean
  error?: string | null
  /** Per-field errors — flags the offending input instead of a detached message. */
  fieldErrors?: BankDetailsFieldErrors
  /** Match the surrounding panel's label weight (`medium` in the wizard, `semibold` in Settings). */
  labelWeight?: 'medium' | 'semibold'
}

/** Bank account fields for the invoice footer — shared by wizard step 2 and Settings → Payment. */
export function BankDetailsFields({
  values,
  onChange,
  disabled = false,
  error,
  fieldErrors = {},
  labelWeight = 'medium',
}: BankDetailsFieldsProps) {
  const { bankDetails } = setupWizardContent.businessProfile
  const { fields } = bankDetails

  function set<K extends keyof BankDetailsForm>(key: K, value: BankDetailsForm[K]) {
    onChange({ ...values, [key]: value })
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-medium text-foreground">{bankDetails.heading}</h3>
        <p className="mt-1 text-sm text-muted">{bankDetails.description}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={fields.accountName.label} labelWeight={labelWeight} error={fieldErrors.accountName}>
          <Input
            aria-invalid={Boolean(fieldErrors.accountName)}
            value={values.accountName}
            onChange={(event) => set('accountName', stripSpaces(event.target.value))}
            placeholder={fields.accountName.placeholder}
            disabled={disabled}
            autoComplete="off"
          />
        </Field>
        <Field
          label={
            <>
              {fields.bankName.label}{' '}
              <span className="font-normal text-muted">{fields.bankName.optional}</span>
            </>
          }
          labelWeight={labelWeight}
        >
          <Input
            value={values.bankName}
            onChange={(event) => set('bankName', event.target.value)}
            placeholder={fields.bankName.placeholder}
            disabled={disabled}
            autoComplete="off"
          />
        </Field>
        <Field label={fields.accountNumber.label} labelWeight={labelWeight} error={fieldErrors.accountNumber}>
          <Input
            aria-invalid={Boolean(fieldErrors.accountNumber)}
            inputMode="numeric"
            maxLength={8}
            value={values.accountNumber}
            onChange={(event) =>
              set('accountNumber', event.target.value.replace(/\D/g, '').slice(0, 8))
            }
            placeholder={fields.accountNumber.placeholder}
            disabled={disabled}
            autoComplete="off"
          />
        </Field>
        <Field label={fields.sortCode.label} labelWeight={labelWeight} error={fieldErrors.sortCode}>
          <Input
            aria-invalid={Boolean(fieldErrors.sortCode)}
            inputMode="numeric"
            maxLength={8}
            value={values.sortCode}
            onChange={(event) => set('sortCode', formatSortCode(event.target.value))}
            placeholder={fields.sortCode.placeholder}
            disabled={disabled}
            autoComplete="off"
          />
        </Field>
      </div>

      {error ? <FieldError message={error} /> : null}
    </div>
  )
}
