import type { FormEvent } from 'react'
import { useState } from 'react'
import type { WizardPaymentData } from '@/types/setup-wizard'
import { setupWizardContent } from '@/content/setup-wizard'
import { Field, Input, Select, Toggle } from '@/components/ui'
import {
  InfoNote,
  StatusPill,
  WizardCard,
  WizardStepTitle,
} from '@/components/setup-wizard/WizardParts'
import { fillCopy } from '@/lib/utils'
import { useReportWizardDirty } from '@/features/setup/lib/wizard-dirty'

interface PaymentSetupStepProps {
  initialValues: WizardPaymentData
  /** Shown as the connected account until the providers report their own name. */
  businessName: string
  vat: { registered: boolean; rate: string }
  /** Stepper position of Business Profile, for the VAT row. */
  businessStepNumber: number
  onChangeVat: () => void
  onSubmit: (values: WizardPaymentData) => void
}

type Provider = 'gocardless' | 'stripe'

function CardIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <rect x="2.5" y="5" width="19" height="14" rx="2" />
      <path d="M2.5 10h19" strokeLinecap="round" />
    </svg>
  )
}

function ExternalLinkIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-4 w-4" aria-hidden="true">
      <path d="M11 3.5h5.5V9M16.5 3.5 9 11M8 4.5H5A1.5 1.5 0 0 0 3.5 6v9A1.5 1.5 0 0 0 5 16.5h9a1.5 1.5 0 0 0 1.5-1.5v-3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5" aria-hidden="true">
      <path d="M3.5 8.5l3 3 6-7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function PaymentSetupStep({
  initialValues,
  businessName,
  vat,
  businessStepNumber,
  onChangeVat,
  onSubmit,
}: PaymentSetupStepProps) {
  const content = setupWizardContent.payments
  const { providers, details, defaults } = content
  const { fields } = defaults

  const [values, setValues] = useState<WizardPaymentData>(initialValues)
  const [dueDaysError, setDueDaysError] = useState<string | null>(null)
  useReportWizardDirty(values, initialValues)

  function updateField<K extends keyof WizardPaymentData>(key: K, value: WizardPaymentData[K]) {
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  /** Connect is a Phase-1 stub (no OAuth yet) — it flips the flag, saved on Continue. */
  function setConnected(provider: Provider, connected: boolean) {
    setValues((prev) => {
      const next = { ...prev }
      if (provider === 'gocardless') {
        next.goCardlessConnected = connected
        if (connected && prev.defaultPaymentMethod === 'BACS') next.defaultPaymentMethod = 'GOCARDLESS'
        if (!connected && prev.defaultPaymentMethod === 'GOCARDLESS') next.defaultPaymentMethod = 'BACS'
      } else {
        next.stripeConnected = connected
        // Card links only work once Stripe is connected.
        next.noDirectDebitAction = connected ? 'card-link' : 'invoice'
        if (!connected && prev.defaultPaymentMethod === 'STRIPE') next.defaultPaymentMethod = 'BACS'
      }
      return next
    })
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const days = Number(values.invoiceDueDays)
    if (!Number.isInteger(days) || days < 0 || days > 90) {
      setDueDaysError(fields.dueDays.invalid)
      return
    }
    onSubmit(values)
  }

  const connected: Record<Provider, boolean> = {
    gocardless: values.goCardlessConnected,
    stripe: values.stripeConnected,
  }

  const methodOptions = content.methods.map((method) => ({
    value: method.value,
    label: method.label,
    disabled: method.requires ? !connected[method.requires] : false,
  }))

  const noDirectDebitOptions = content.noDirectDebitActions.map((action) => ({
    value: action.value,
    label: action.label,
    disabled: action.requiresStripe ? !values.stripeConnected : false,
  }))

  function connectionBadge(provider: Provider) {
    return connected[provider] ? (
      <StatusPill tone="success">
        <CheckIcon />
        {content.status.connected}
      </StatusPill>
    ) : (
      <StatusPill tone="neutral">{content.status.notConnected}</StatusPill>
    )
  }

  function connectedDetails(provider: Provider) {
    return (
      <div className="flex flex-wrap items-end justify-between gap-4">
        <dl className="flex flex-wrap gap-x-10 gap-y-3">
          <div>
            <dt className="text-sm text-muted">{details.account}</dt>
            <dd className="mt-0.5 text-[15px] text-foreground">{businessName || '—'}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted">{details.mode}</dt>
            <dd className="mt-0.5">
              {/* Phase 1: connections are stubs, so every account is in test mode. */}
              <StatusPill tone="warning">{details.testMode}</StatusPill>
            </dd>
          </div>
        </dl>
        <button
          type="button"
          onClick={() => setConnected(provider, false)}
          className="rounded-xl border border-danger/40 bg-card px-5 py-2.5 text-sm font-semibold text-danger transition-colors hover:bg-danger/5 sm:text-[15px]"
        >
          {providers[provider].disconnect}
        </button>
      </div>
    )
  }

  function connectButton(provider: Provider) {
    return (
      <button
        type="button"
        onClick={() => setConnected(provider, true)}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-foreground px-4 py-3 text-[15px] font-semibold text-background transition-opacity hover:opacity-90 active:scale-[0.99]"
      >
        <ExternalLinkIcon />
        {providers[provider].connect}
      </button>
    )
  }

  return (
    <form id="setup-wizard-step-form" onSubmit={handleSubmit} noValidate className="space-y-6">
      <WizardStepTitle icon={<CardIcon />} title={content.heading} subtitle={content.subheading} />

      <InfoNote>{content.info}</InfoNote>

      <WizardCard
        tone={values.goCardlessConnected ? 'accent' : 'default'}
        heading={providers.gocardless.name}
        description={providers.gocardless.description}
        action={connectionBadge('gocardless')}
      >
        {values.goCardlessConnected ? (
          connectedDetails('gocardless')
        ) : (
          connectButton('gocardless')
        )}
      </WizardCard>

      <WizardCard
        tone={values.stripeConnected ? 'accent' : 'default'}
        heading={providers.stripe.name}
        description={providers.stripe.description}
        action={connectionBadge('stripe')}
      >
        {values.stripeConnected ? (
          connectedDetails('stripe')
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-foreground sm:text-[15px]">{providers.stripe.explainer}</p>
            {connectButton('stripe')}
          </div>
        )}
      </WizardCard>

      <WizardCard heading={defaults.heading} description={defaults.description}>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label={fields.method.label} labelWeight="medium">
            <Select
              value={values.defaultPaymentMethod}
              onChange={(event) => updateField('defaultPaymentMethod', event.target.value)}
              options={methodOptions}
            />
            {values.stripeConnected ? null : (
              <p className="mt-2 text-sm text-muted">{fields.method.stripeDisabledHint}</p>
            )}
          </Field>

          <Field label={fields.timing.label} labelWeight="medium">
            <Select
              value={values.paymentTiming}
              onChange={(event) =>
                updateField('paymentTiming', event.target.value as WizardPaymentData['paymentTiming'])
              }
              options={content.timings}
            />
            <p className="mt-2 text-sm text-muted">{fields.timing.hint}</p>
          </Field>

          <Field label={fields.dueDays.label} labelWeight="medium" error={dueDaysError}>
            <div className="relative">
              <Input
                inputMode="numeric"
                aria-invalid={Boolean(dueDaysError)}
                value={values.invoiceDueDays}
                onChange={(event) => {
                  updateField('invoiceDueDays', event.target.value.replace(/\D/g, '').slice(0, 2))
                  setDueDaysError(null)
                }}
                className="pr-16"
              />
              <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-[15px] text-muted">
                {fields.dueDays.suffix}
              </span>
            </div>
          </Field>

          <Field label={fields.noDirectDebit.label} labelWeight="medium">
            <Select
              value={values.noDirectDebitAction}
              onChange={(event) =>
                updateField('noDirectDebitAction', event.target.value as WizardPaymentData['noDirectDebitAction'])
              }
              options={noDirectDebitOptions}
            />
            {values.stripeConnected ? null : (
              <p className="mt-2 text-sm text-muted">{fields.noDirectDebit.hint}</p>
            )}
          </Field>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-border bg-foreground/[0.02] px-5 py-3.5">
          <span className="text-[15px] font-medium text-foreground">{defaults.vat.label}</span>
          <StatusPill tone={vat.registered ? 'primary' : 'neutral'}>
            {vat.registered ? fillCopy(defaults.vat.registered, { rate: vat.rate }) : defaults.vat.notRegistered}
          </StatusPill>
          <span className="text-sm text-muted sm:text-[15px]">
            {fillCopy(defaults.vat.source, { step: businessStepNumber })}
          </span>
          <button
            type="button"
            onClick={onChangeVat}
            className="ml-auto text-sm font-medium text-primary transition-opacity hover:opacity-75 sm:text-[15px]"
          >
            {defaults.vat.change}
          </button>
        </div>

        <div className="mt-5 flex items-center justify-between gap-6">
          <div>
            <p className="text-sm font-medium text-foreground sm:text-[15px]">{fields.debtHold.label}</p>
            <p className="mt-0.5 text-sm text-muted">{fields.debtHold.description}</p>
          </div>
          <Toggle
            checked={values.debtHoldEnabled}
            onChange={(debtHoldEnabled) => updateField('debtHoldEnabled', debtHoldEnabled)}
            ariaLabel={fields.debtHold.label}
          />
        </div>
      </WizardCard>
    </form>
  )
}
