import { useState } from 'react'
import { settingsContent } from '@/content/settings'
import { Field, FieldError, Input, Select } from '@/components/ui'
import { useToast } from '@/components/ui/toast'
import {
  useConnectGoCardless,
  useSaveGoCardlessWebhookSecret,
} from '@/features/settings/hooks/useSettings'
import { errorMessage } from '@/lib/errors'

export type GoCardlessEnvironment = 'sandbox' | 'live'

/**
 * GoCardless is token-based (no OAuth redirect): the admin pastes an access token and picks
 * the environment. On success the caller gets the webhook URL to show in the next step.
 */
export function GoCardlessTokenForm({
  onConnected,
  onCancel,
}: {
  onConnected: (result: { webhookUrl: string | null; environment: GoCardlessEnvironment }) => void
  onCancel: () => void
}) {
  const copy = settingsContent.paymentSetup.goCardlessConnect
  const connect = useConnectGoCardless()
  const { showToast } = useToast()
  const [token, setToken] = useState('')
  const [environment, setEnvironment] = useState<GoCardlessEnvironment>('live')
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    if (connect.isPending) return
    if (!token.trim()) {
      setError(copy.tokenRequired)
      return
    }
    setError(null)
    try {
      const result = await connect.mutateAsync({ accessToken: token.trim(), environment })
      showToast(copy.connected)
      onConnected({ webhookUrl: result.webhookUrl ?? null, environment })
    } catch (err) {
      setError(errorMessage(err) || copy.failed)
    }
  }

  return (
    <div className="mt-4 space-y-3 rounded-lg border border-border bg-surface p-3">
      <Field label={copy.tokenLabel} labelWeight="medium" size="sm">
        <Input
          inputSize="sm"
          value={token}
          onChange={(event) => {
            setToken(event.target.value)
            setError(null)
          }}
          onKeyDown={(event) => {
            if (event.key !== 'Enter') return
            // Inside the wizard this would otherwise submit the step form.
            event.preventDefault()
            void submit()
          }}
          placeholder={copy.tokenPlaceholder}
          autoComplete="off"
        />
      </Field>
      <Field label={copy.environmentLabel} labelWeight="medium" size="sm">
        <Select
          inputSize="sm"
          value={environment}
          onChange={(event) => setEnvironment(event.target.value as GoCardlessEnvironment)}
          options={[...copy.environments]}
        />
      </Field>
      {error ? <FieldError message={error} size="sm" /> : null}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => void submit()}
          disabled={connect.isPending}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-3.5 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {connect.isPending ? copy.connecting : copy.connect}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={connect.isPending}
          className="rounded-xl border border-border px-3.5 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-card disabled:opacity-60"
        >
          {copy.cancel}
        </button>
      </div>
    </div>
  )
}

/**
 * Step after connecting GoCardless: the admin adds our webhook URL in their GoCardless
 * dashboard and pastes back the secret GoCardless shows (PATCH …/gocardless/webhook-secret).
 * Until it's saved, GoCardless webhooks are ignored.
 */
export function GoCardlessWebhookSetup({
  webhookUrl,
  onSaved,
  onLater,
}: {
  webhookUrl: string | null
  onSaved: () => void
  onLater: () => void
}) {
  const copy = settingsContent.paymentSetup.goCardlessWebhook
  const saveSecret = useSaveGoCardlessWebhookSecret()
  const { showToast } = useToast()
  const [secret, setSecret] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  async function copyUrl() {
    if (!webhookUrl) return
    try {
      await navigator.clipboard.writeText(webhookUrl)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard blocked — the URL is still selectable in the box.
    }
  }

  async function save() {
    if (!secret.trim()) {
      setError(copy.secretRequired)
      return
    }
    setError(null)
    try {
      await saveSecret.mutateAsync(secret.trim())
      showToast(copy.saved)
      onSaved()
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  return (
    <div className="mt-4 space-y-3 rounded-lg border border-warning-border bg-warning-surface/60 p-3">
      <div>
        <p className="text-sm font-semibold text-foreground">{copy.title}</p>
        <p className="mt-1 text-xs leading-relaxed text-muted">{copy.intro}</p>
      </div>
      <ol className="list-decimal space-y-1 pl-4 text-xs leading-relaxed text-foreground">
        {copy.steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>

      <Field label={copy.urlLabel} labelWeight="medium" size="sm">
        {webhookUrl ? (
          <div className="flex gap-2">
            <Input inputSize="sm" value={webhookUrl} readOnly onFocus={(event) => event.target.select()} />
            <button
              type="button"
              onClick={() => void copyUrl()}
              className="shrink-0 rounded-xl border border-border bg-card px-3 text-sm font-semibold text-foreground transition-colors hover:bg-surface"
            >
              {copied ? copy.copied : copy.copy}
            </button>
          </div>
        ) : (
          <p className="text-xs text-muted">{copy.urlMissing}</p>
        )}
      </Field>

      <Field label={copy.secretLabel} labelWeight="medium" size="sm" error={error}>
        <Input
          inputSize="sm"
          value={secret}
          aria-invalid={Boolean(error)}
          onChange={(event) => {
            setSecret(event.target.value)
            setError(null)
          }}
          onKeyDown={(event) => {
            if (event.key !== 'Enter') return
            event.preventDefault()
            void save()
          }}
          placeholder={copy.secretPlaceholder}
          autoComplete="off"
        />
      </Field>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => void save()}
          disabled={saveSecret.isPending}
          className="rounded-xl bg-primary px-3.5 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {saveSecret.isPending ? copy.saving : copy.save}
        </button>
        <button
          type="button"
          onClick={onLater}
          disabled={saveSecret.isPending}
          className="rounded-xl border border-border px-3.5 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-card disabled:opacity-60"
        >
          {copy.later}
        </button>
      </div>
    </div>
  )
}
