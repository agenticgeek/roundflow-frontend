import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'
import type { WizardPaymentData } from '@/types/setup-wizard'
import { setupWizardContent } from '@/content/setup-wizard'
import { settingsContent } from '@/content/settings'
import { Field, FieldError, Input, Select, Toggle } from '@/components/ui'
import {
  GoCardlessTokenForm,
  GoCardlessWebhookSetup,
  type GoCardlessEnvironment,
} from '@/components/payments/GoCardlessConnect'
import {
  InfoNote,
  StatusPill,
  WizardCard,
  WizardStepTitle,
} from '@/components/setup-wizard/WizardParts'
import { fillCopy } from '@/lib/utils'
import { useReportWizardDirty } from '@/features/setup/lib/wizard-dirty'

type Provider = 'gocardless' | 'stripe'

interface PaymentSetupStepProps {
  initialValues: WizardPaymentData
  /** What the server says is connected — connecting and disconnecting go through the real APIs. */
  connections: Record<Provider, boolean>
  /**
   * The connect/disconnect endpoints only work once setup is complete (they 403 before). While
   * setup is in progress the cards show status and point to Settings → Payment instead.
   */
  canConnect: boolean
  vat: { registered: boolean; rate: string }
  /** Stepper position of Business Profile, for the VAT row. */
  businessStepNumber: number
  onChangeVat: () => void
  /** Saves this step, then leaves for Stripe's OAuth (it comes back to the wizard). */
  onConnectStripe: (values: WizardPaymentData) => Promise<void>
  onDisconnect: (provider: Provider) => Promise<void>
  onSubmit: (values: WizardPaymentData) => void
}

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
  connections,
  canConnect,
  vat,
  businessStepNumber,
  onChangeVat,
  onConnectStripe,
  onDisconnect,
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

  const [gcFormOpen, setGcFormOpen] = useState(false)
  /** Webhook step after connecting GoCardless — the URL only comes back from the connect call. */
  const [gcWebhook, setGcWebhook] = useState<{ url: string | null } | null>(null)
  const [gcEnvironment, setGcEnvironment] = useState<GoCardlessEnvironment | null>(null)
  const [gcSecretSaved, setGcSecretSaved] = useState(false)
  const [busy, setBusy] = useState<Provider | null>(null)
  const [providerError, setProviderError] = useState<{ provider: Provider; message: string } | null>(null)

  // A default that needs a provider stops being valid once that provider is disconnected.
  useEffect(() => {
    setValues((prev) => {
      const next = { ...prev }
      if (!connections.stripe && prev.noDirectDebitAction === 'card-link') next.noDirectDebitAction = 'invoice'
      if (
        (!connections.stripe && prev.defaultPaymentMethod === 'STRIPE') ||
        (!connections.gocardless && prev.defaultPaymentMethod === 'GOCARDLESS')
      ) {
        next.defaultPaymentMethod = 'BACS'
      }
      return next.noDirectDebitAction === prev.noDirectDebitAction &&
        next.defaultPaymentMethod === prev.defaultPaymentMethod
        ? prev
        : next
    })
  }, [connections.stripe, connections.gocardless])

  async function connectStripe() {
    setBusy('stripe')
    setProviderError(null)
    try {
      await onConnectStripe(values)
      // The page navigates away to Stripe from here.
    } catch (err) {
      setBusy(null)
      setProviderError({ provider: 'stripe', message: err instanceof Error ? err.message : String(err) })
    }
  }

  async function disconnect(provider: Provider) {
    setBusy(provider)
    setProviderError(null)
    try {
      await onDisconnect(provider)
      if (provider === 'gocardless') {
        // The server clears the webhook secret too — reconnecting needs it again.
        setGcWebhook(null)
        setGcSecretSaved(false)
        setGcEnvironment(null)
      }
    } catch (err) {
      setProviderError({ provider, message: err instanceof Error ? err.message : String(err) })
    } finally {
      setBusy(null)
    }
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

  const connected = connections

  const methodOptions = content.methods.map((method) => ({
    value: method.value,
    label: method.label,
    disabled: method.requires ? !connected[method.requires] : false,
  }))

  const noDirectDebitOptions = content.noDirectDebitActions.map((action) => ({
    value: action.value,
    label: action.label,
    disabled: action.requiresStripe ? !connections.stripe : false,
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
    const disconnectCopy = settingsContent.paymentSetup
    return (
      <div className="flex flex-wrap items-end justify-between gap-4">
        {provider === 'gocardless' && gcEnvironment ? (
          <dl>
            <dt className="text-sm text-muted">{details.mode}</dt>
            <dd className="mt-0.5">
              <StatusPill tone={gcEnvironment === 'sandbox' ? 'warning' : 'success'}>
                {gcEnvironment === 'sandbox' ? details.sandbox : details.live}
              </StatusPill>
            </dd>
          </dl>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={() => void disconnect(provider)}
          disabled={busy !== null || !canConnect}
          className="rounded-xl border border-danger/40 bg-card px-5 py-2.5 text-sm font-semibold text-danger transition-colors hover:bg-danger/5 disabled:opacity-60 sm:text-[15px]"
        >
          {busy === provider ? disconnectCopy.disconnecting : providers[provider].disconnect}
        </button>
      </div>
    )
  }

  function connectButton(provider: Provider) {
    if (!canConnect) {
      return (
        <p className="rounded-xl border border-dashed border-border bg-foreground/[0.02] px-4 py-3 text-sm text-muted">
          {content.connectAfterSetup.replace('{provider}', providers[provider].name)}
        </p>
      )
    }
    return (
      <button
        type="button"
        onClick={() => (provider === 'stripe' ? void connectStripe() : setGcFormOpen(true))}
        disabled={busy !== null}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-foreground px-4 py-3 text-[15px] font-semibold text-background transition-opacity hover:opacity-90 active:scale-[0.99] disabled:opacity-60"
      >
        <ExternalLinkIcon />
        {provider === 'stripe' && busy === 'stripe' ? content.stripeRedirecting : providers[provider].connect}
      </button>
    )
  }

  function providerErrorFor(provider: Provider) {
    return providerError?.provider === provider ? <FieldError message={providerError.message} /> : null
  }

  return (
    <form id="setup-wizard-step-form" onSubmit={handleSubmit} noValidate className="space-y-6">
      <WizardStepTitle icon={<CardIcon />} title={content.heading} subtitle={content.subheading} />

      <InfoNote>{content.info}</InfoNote>

      <WizardCard
        tone={connections.gocardless ? 'accent' : 'default'}
        heading={providers.gocardless.name}
        description={providers.gocardless.description}
        action={connectionBadge('gocardless')}
      >
        {connections.gocardless ? (
          <>
            {connectedDetails('gocardless')}
            {!canConnect ? null : gcWebhook ? (
              <GoCardlessWebhookSetup
                webhookUrl={gcWebhook.url}
                onSaved={() => {
                  setGcSecretSaved(true)
                  setGcWebhook(null)
                }}
                onLater={() => setGcWebhook(null)}
              />
            ) : (
              <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
                {gcSecretSaved ? (
                  <span className="text-success">{settingsContent.paymentSetup.goCardlessWebhook.savedNote}</span>
                ) : null}
                <button
                  type="button"
                  onClick={() => setGcWebhook({ url: null })}
                  className="font-semibold text-primary hover:underline"
                >
                  {settingsContent.paymentSetup.goCardlessWebhook.reopen}
                </button>
              </div>
            )}
          </>
        ) : gcFormOpen ? (
          <GoCardlessTokenForm
            onConnected={({ webhookUrl, environment }) => {
              setGcFormOpen(false)
              setGcEnvironment(environment)
              setGcSecretSaved(false)
              // Connected, but not finished: the webhook still needs adding in GoCardless.
              setGcWebhook({ url: webhookUrl })
              if (values.defaultPaymentMethod === 'BACS') updateField('defaultPaymentMethod', 'GOCARDLESS')
            }}
            onCancel={() => setGcFormOpen(false)}
          />
        ) : (
          connectButton('gocardless')
        )}
        {providerErrorFor('gocardless')}
      </WizardCard>

      <WizardCard
        tone={connections.stripe ? 'accent' : 'default'}
        heading={providers.stripe.name}
        description={providers.stripe.description}
        action={connectionBadge('stripe')}
      >
        {connections.stripe ? (
          connectedDetails('stripe')
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-foreground sm:text-[15px]">{providers.stripe.explainer}</p>
            {connectButton('stripe')}
          </div>
        )}
        {providerErrorFor('stripe')}
      </WizardCard>

      <WizardCard heading={defaults.heading} description={defaults.description}>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label={fields.method.label} labelWeight="medium">
            <Select
              value={values.defaultPaymentMethod}
              onChange={(event) => updateField('defaultPaymentMethod', event.target.value)}
              options={methodOptions}
            />
            {connections.stripe ? null : (
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
            {connections.stripe ? null : (
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
