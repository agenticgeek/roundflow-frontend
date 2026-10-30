import { useState, type FormEvent } from 'react'
import { settingsContent } from '@/content/settings'
import { Field, Input } from '@/components/ui'
import { useToast } from '@/components/ui/toast'
import {
  useConnectGhl,
  useDisconnectGhl,
  useGhlOAuthConnect,
  useGhlStatus,
  useTestGhl,
} from '@/features/settings/hooks/useGhl'
import { errorMessage } from '@/lib/errors'
import { cn, fillCopy } from '@/lib/utils'

const buttonClass =
  'rounded-lg px-4 py-2 text-sm font-semibold transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60'

/**
 * Settings › Integrations › Messaging (GoHighLevel), GAP-017. Status from
 * `GET /settings/ghl/status`; connect with GoHighLevel sign-in (OAuth — returns to
 * /settings/integrations?ghl=…) or a Private Integration token + Location ID; "Test connection";
 * the webhook URL to paste into GHL; disconnect. Errors show the server's reason. Every call
 * works before setup is complete, so the setup wizard's Messages step uses this card too.
 */
export function GhlConnectionCard({ canMutate }: { canMutate: boolean }) {
  const copy = settingsContent.ghl
  const { showToast } = useToast()
  const statusQuery = useGhlStatus()
  const connect = useConnectGhl()
  const disconnect = useDisconnectGhl()
  const test = useTestGhl()
  const oauth = useGhlOAuthConnect()

  const [apiKey, setApiKey] = useState('')
  const [locationId, setLocationId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [confirmingDisconnect, setConfirmingDisconnect] = useState(false)

  const status = statusQuery.data
  const connected = Boolean(status?.connected)
  const busy = connect.isPending || disconnect.isPending || test.isPending || oauth.isPending

  async function handleConnect(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const key = apiKey.trim()
    const location = locationId.trim()
    if (!key) return setError(copy.tokenRequired)
    if (!location) return setError(copy.locationRequired)
    setError(null)
    try {
      await connect.mutateAsync({ apiKey: key, locationId: location })
      setApiKey('')
      setLocationId('')
      showToast(copy.connectedToast)
    } catch (caught) {
      setError(errorMessage(caught))
    }
  }

  async function handleOAuth() {
    setError(null)
    try {
      await oauth.mutateAsync()
      // The page navigates to GoHighLevel from here.
    } catch (caught) {
      setError(errorMessage(caught))
    }
  }

  async function handleTest() {
    setError(null)
    try {
      const result = await test.mutateAsync()
      showToast(
        result.locationName ? fillCopy(copy.testOkLocation, { location: result.locationName }) : copy.testOk,
      )
    } catch (caught) {
      setError(errorMessage(caught))
    }
  }

  async function handleDisconnect() {
    setError(null)
    try {
      await disconnect.mutateAsync()
      setConfirmingDisconnect(false)
      showToast(copy.disconnectedToast)
    } catch (caught) {
      setError(errorMessage(caught))
    }
  }

  async function copyWebhook(url: string) {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
    } catch {
      // Clipboard blocked — the URL stays selectable in the box.
    }
  }

  const badge = statusQuery.isPending ? copy.loading : connected ? copy.connected : copy.notConnected

  return (
    <section className="rounded-lg border border-border bg-card p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-2xl">
          <h3 className="text-base font-semibold text-foreground">{copy.title}</h3>
          <p className="mt-1 text-sm text-muted">{copy.description}</p>
        </div>
        <span
          className={cn(
            'rounded-full px-3 py-1 text-xs font-semibold',
            connected ? 'bg-success/10 text-success' : 'bg-muted/15 text-muted',
          )}
        >
          {badge}
        </span>
      </div>

      {statusQuery.isError ? (
        <div className="mt-4 text-sm">
          <p className="text-danger">{copy.loadError}</p>
          <button
            type="button"
            onClick={() => void statusQuery.refetch()}
            className="mt-1 font-semibold text-primary underline underline-offset-2"
          >
            {copy.retry}
          </button>
        </div>
      ) : null}

      {!canMutate ? <p className="mt-4 text-sm text-muted">{copy.readOnly}</p> : null}

      {status?.connected ? (
        <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted">{copy.location}</dt>
            <dd className="mt-0.5 font-medium text-foreground">{status.locationName ?? status.locationId ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-muted">{copy.method}</dt>
            <dd className="mt-0.5 font-medium text-foreground">
              {status.method ? copy.methods[status.method] : '—'}
            </dd>
          </div>
        </dl>
      ) : null}

      {status?.connected && status.webhookUrl ? (
        <div className="mt-5 space-y-3 rounded-lg border border-warning-border bg-warning-surface/60 p-4">
          <div>
            <p className="text-sm font-semibold text-foreground">{copy.webhookTitle}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted">{copy.webhookIntro}</p>
          </div>
          <Field label={copy.webhookLabel} labelWeight="medium" size="sm">
            <div className="flex gap-2">
              <Input
                inputSize="sm"
                aria-label={copy.webhookLabel}
                value={status.webhookUrl}
                readOnly
                onFocus={(event) => event.target.select()}
              />
              <button
                type="button"
                onClick={() => void copyWebhook(status.webhookUrl as string)}
                className="shrink-0 rounded-xl border border-border bg-card px-3 text-sm font-semibold text-foreground hover:bg-surface"
              >
                {copied ? copy.copied : copy.copy}
              </button>
            </div>
          </Field>
        </div>
      ) : null}

      {connected && canMutate ? (
        <div className="mt-5 border-t border-border pt-5">
          {confirmingDisconnect ? (
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm text-foreground">{copy.disconnectConfirm}</p>
              <button
                type="button"
                onClick={() => void handleDisconnect()}
                disabled={busy}
                className={cn(buttonClass, 'bg-danger text-primary-foreground')}
              >
                {disconnect.isPending ? copy.disconnecting : copy.disconnectYes}
              </button>
              <button
                type="button"
                onClick={() => setConfirmingDisconnect(false)}
                disabled={busy}
                className="text-sm font-semibold text-muted"
              >
                {copy.cancel}
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void handleTest()}
                disabled={busy}
                className={cn(buttonClass, 'border border-primary/30 text-primary')}
              >
                {test.isPending ? copy.testing : copy.test}
              </button>
              <button
                type="button"
                onClick={() => setConfirmingDisconnect(true)}
                className={cn(buttonClass, 'border border-danger text-danger')}
              >
                {copy.disconnect}
              </button>
            </div>
          )}
        </div>
      ) : null}

      {!connected && !statusQuery.isPending && canMutate ? (
        <div className="mt-5 space-y-4">
          <button
            type="button"
            onClick={() => void handleOAuth()}
            disabled={busy}
            className={cn(buttonClass, 'bg-primary text-primary-foreground')}
          >
            {oauth.isPending ? copy.oauthRedirecting : copy.oauthConnect}
          </button>
          <p className="text-sm font-medium text-muted">{copy.oauthOr}</p>
          <form className="grid gap-4 md:grid-cols-2" onSubmit={(event) => void handleConnect(event)} noValidate>
            <Field label={copy.tokenLabel} labelWeight="medium" size="sm">
              <Input
                inputSize="sm"
                type="password"
                aria-label={copy.tokenLabel}
                autoComplete="off"
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
                placeholder={copy.tokenPlaceholder}
                disabled={connect.isPending}
              />
              <p className="mt-1 text-xs text-muted">{copy.tokenHint}</p>
            </Field>
            <Field label={copy.locationLabel} labelWeight="medium" size="sm">
              <Input
                inputSize="sm"
                aria-label={copy.locationLabel}
                autoComplete="off"
                value={locationId}
                onChange={(event) => setLocationId(event.target.value)}
                placeholder={copy.locationPlaceholder}
                disabled={connect.isPending}
              />
              <p className="mt-1 text-xs text-muted">{copy.locationHint}</p>
            </Field>
            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={busy}
                className={cn(buttonClass, 'border border-primary/30 text-primary')}
              >
                {connect.isPending ? copy.connecting : copy.connect}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="mt-4 text-sm text-danger">
          {error}
        </p>
      ) : null}
    </section>
  )
}
