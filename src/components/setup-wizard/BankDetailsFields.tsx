import type { BankDetailsForm } from '@/types/setup-wizard'
import { setupWizardContent } from '@/content/setup-wizard'
import { Field, FieldError, Input } from '@/components/ui'
import { stripSpaces } from '@/lib/bank-details'

interface BankDetailsFieldsProps {
  values: BankDetailsForm
  onChange: (values: BankDetailsForm) => void
  disabled?: boolean
  error?: string | null
  /** Match the surrounding panel's label weight (`medium` in the wizard, `semibold` in Settings). */
  labelWeight?: 'medium' | 'semibold'
}

/** Bank account fields for the invoice footer — shared by wizard step 2 and Settings → Payment. */
export function BankDetailsFields({
  values,
  onChange,
  disabled = false,
  error,
  labelWeight = 'medium',
}: BankDetailsFieldsProps) {
  const { bankDetails } = setupWizardContent.paymentSetup
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
        <Field label={fields.accountName.label} labelWeight={labelWeight}>
          <Input
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
        <Field label={fields.accountNumber.label} labelWeight={labelWeight}>
          <Input
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
      </div>

      {error ? <FieldError message={error} /> : null}
    </div>
  )
}
