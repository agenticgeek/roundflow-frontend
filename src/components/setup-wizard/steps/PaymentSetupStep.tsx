import type { FormEvent } from 'react'
import { useState } from 'react'
import type { PaymentSetupData } from '@/types/setup-wizard'
import { setupWizardContent } from '@/content/setup-wizard'
import { Field, Select, Toggle } from '@/components/ui'
import { cn } from '@/lib/utils'

interface PaymentSetupStepProps {
  initialValues: PaymentSetupData
  onSubmit: (values: PaymentSetupData) => void
}

function PaymentSetupIcon() {
  return (
    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true">
        <rect x="2" y="5" width="20" height="14" rx="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M2 10h20" strokeLinecap="round" />
      </svg>
    </span>
  )
}

function ExternalLinkIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M4.25 5.5a.75.75 0 0 0-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 0 0 .75-.75v-4a.75.75 0 0 1 1.5 0v4A2.25 2.25 0 0 1 12.75 17h-8.5A2.25 2.25 0 0 1 2 14.75v-8.5A2.25 2.25 0 0 1 4.25 4h5a.75.75 0 0 1 0 1.5h-5Z"
        clipRule="evenodd"
      />
      <path
        fillRule="evenodd"
        d="M6.194 12.753a.75.75 0 0 0 1.06.053L16.5 4.31v2.44a.75.75 0 0 0 1.5 0v-4a.75.75 0 0 0-.75-.75h-4a.75.75 0 0 0 0 1.5h2.31l-9.194 8.496a.75.75 0 0 0-.053 1.06Z"
        clipRule="evenodd"
      />
    </svg>
  )
}

export function PaymentSetupStep({ initialValues, onSubmit }: PaymentSetupStepProps) {
  const { paymentSetup } = setupWizardContent
  const { providers, settings, status } = paymentSetup

  const [values, setValues] = useState<PaymentSetupData>(initialValues)

  function updateField<K extends keyof PaymentSetupData>(key: K, value: PaymentSetupData[K]) {
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSubmit(values)
  }

  function handleConnect(providerId: 'gocardless' | 'stripe') {
    if (providerId === 'gocardless') updateField('goCardlessConnected', true)
    if (providerId === 'stripe') updateField('stripeConnected', true)
  }

  const connectionMap = {
    gocardless: values.goCardlessConnected,
    stripe: values.stripeConnected,
  } as const

  return (
    <form id="setup-wizard-step-form" onSubmit={handleSubmit} noValidate className="space-y-8">
      <div className="flex items-start gap-4 border-b border-border pb-6">
        <PaymentSetupIcon />
        <div>
          <h2 className="text-xl font-semibold text-foreground">{paymentSetup.heading}</h2>
          <p className="mt-1 text-sm text-muted">{paymentSetup.subheading}</p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {providers.map((provider) => {
          const connected = connectionMap[provider.id]
          return (
            <div
              key={provider.id}
              className="rounded-xl border border-border bg-background p-5 sm:p-6"
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-base font-medium text-foreground">{provider.name}</h3>
                <span className={cn('text-xs', connected ? 'text-success' : 'text-muted')}>
                  {connected ? status.connected : status.notConnected}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted">{provider.description}</p>
              <button
                type="button"
                onClick={() => handleConnect(provider.id)}
                disabled={connected}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-[15px] font-semibold text-primary-foreground transition-all duration-200 hover:opacity-90 active:scale-[0.98] disabled:cursor-default disabled:opacity-60"
              >
                <ExternalLinkIcon />
                {provider.connectLabel}
              </button>
            </div>
          )
        })}
      </div>

      <div className="space-y-6">
        <h3 className="text-base font-medium text-foreground">{settings.heading}</h3>

        <Field label={settings.defaultPaymentRule.label} labelWeight="medium">
          <Select
            value={values.defaultPaymentRule}
            onChange={(e) => updateField('defaultPaymentRule', e.target.value)}
            options={paymentSetup.paymentRules}
          />
        </Field>

        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-foreground">{settings.vatApplicable.label}</p>
            <p className="mt-0.5 text-sm text-muted">{settings.vatApplicable.description}</p>
          </div>
          <Toggle
            checked={values.vatApplicable}
            onChange={(vatApplicable) => updateField('vatApplicable', vatApplicable)}
            ariaLabel={settings.vatApplicable.label}
          />
        </div>

        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-foreground">{settings.debtHoldEnabled.label}</p>
            <p className="mt-0.5 text-sm text-muted">{settings.debtHoldEnabled.description}</p>
          </div>
          <Toggle
            checked={values.debtHoldEnabled}
            onChange={(debtHoldEnabled) => updateField('debtHoldEnabled', debtHoldEnabled)}
            ariaLabel={settings.debtHoldEnabled.label}
          />
        </div>
      </div>
    </form>
  )
}
