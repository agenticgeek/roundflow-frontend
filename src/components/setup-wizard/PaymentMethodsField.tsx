import { Field, Select } from '@/components/ui'
import { PAYMENT_METHOD_OPTIONS } from '@/lib/payment-methods'
import { setupWizardContent } from '@/content/setup-wizard'
import { cn } from '@/lib/utils'

interface PaymentMethodsValue {
  acceptedPaymentMethods: string[]
  defaultPaymentMethod: string
}

interface PaymentMethodsFieldProps {
  values: PaymentMethodsValue
  connections: { gocardless: boolean; stripe: boolean }
  onChange: (patch: Partial<PaymentMethodsValue>) => void
  disabled?: boolean
  selectClassName?: string
}

/**
 * BUG-05: which payment methods the business accepts (any number, GoCardless and Stripe included
 * even before they are connected — they only carry a "Not connected yet" tag), plus the primary
 * method, which must come from that list.
 */
export function PaymentMethodsField({
  values,
  connections,
  onChange,
  disabled = false,
  selectClassName,
}: PaymentMethodsFieldProps) {
  const copy = setupWizardContent.payments.defaults.fields.method
  const accepted = values.acceptedPaymentMethods
  const notConnected = (method: string) =>
    (method === 'GOCARDLESS' && !connections.gocardless) || (method === 'STRIPE' && !connections.stripe)

  function toggle(method: string, checked: boolean) {
    if (checked) {
      const next = PAYMENT_METHOD_OPTIONS.map((option) => option.value as string).filter(
        (value) => value === method || accepted.includes(value),
      )
      onChange({ acceptedPaymentMethods: next, defaultPaymentMethod: values.defaultPaymentMethod || method })
      return
    }
    // At least one method stays ticked.
    if (accepted.length <= 1) return
    const next = accepted.filter((value) => value !== method)
    onChange({
      acceptedPaymentMethods: next,
      defaultPaymentMethod: values.defaultPaymentMethod === method ? (next[0] ?? '') : values.defaultPaymentMethod,
    })
  }

  return (
    <div className="space-y-4">
      <Field label={copy.acceptedLabel} labelWeight="medium">
        <div role="group" aria-label={copy.acceptedLabel} className="grid gap-2 sm:grid-cols-2">
          {PAYMENT_METHOD_OPTIONS.map((option) => {
            const checked = accepted.includes(option.value)
            return (
              <label
                key={option.value}
                className={cn(
                  'flex cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-2.5 text-sm',
                  checked ? 'border-primary bg-primary/5' : 'border-border bg-card',
                )}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={disabled}
                  onChange={(event) => toggle(option.value, event.target.checked)}
                  className="h-4 w-4 shrink-0 rounded border-border accent-primary"
                />
                <span className="flex-1 text-foreground">{option.label}</span>
                {notConnected(option.value) ? (
                  <span className="rounded-full bg-surface px-2 py-0.5 text-[11px] font-semibold text-muted">
                    {copy.notConnectedTag}
                  </span>
                ) : null}
              </label>
            )
          })}
        </div>
      </Field>
      <Field label={copy.label} labelWeight="medium">
        <Select
          aria-label={copy.label}
          value={values.defaultPaymentMethod}
          onChange={(event) => onChange({ defaultPaymentMethod: event.target.value })}
          options={PAYMENT_METHOD_OPTIONS.filter((option) => accepted.includes(option.value))}
          disabled={disabled}
          className={selectClassName}
        />
        <p className="mt-2 text-sm text-muted">{copy.primaryHint}</p>
      </Field>
    </div>
  )
}
