import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { settingsApi } from '@/api/settings.api'
import { FullScreenLoader } from '@/components/FullScreenLoader'
import { settingsContent } from '@/content/settings'
import { errorMessage } from '@/lib/errors'
import { consumeStripeReturn, parseStripeCallback, withStripeConnected } from '@/lib/stripe-connect'

/**
 * Stripe Connect redirect URI. Finishes the OAuth exchange through the API with the admin's
 * bearer token, then goes back to where Connect was started (the setup wizard's Payments step, or
 * Settings > Payment Setup) with ?stripe=connected.
 */
export default function StripeCallback() {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  // Stripe's code is single use; StrictMode's double effect must not exchange it twice.
  const started = useRef(false)
  // Read once: the stored return is single use.
  const [target] = useState(consumeStripeReturn)

  useEffect(() => {
    if (started.current) return
    started.current = true

    const result = parseStripeCallback(window.location.search)
    if (result.kind === 'error') {
      setError(result.message)
      return
    }
    settingsApi
      .completeStripeConnect(result.code, result.state)
      .then(() => navigate(withStripeConnected(target.path), { replace: true }))
      .catch((err: unknown) => setError(errorMessage(err)))
  }, [navigate, target])

  if (!error) return <FullScreenLoader />

  return (
    <main className="flex min-h-svh items-center justify-center bg-background px-6">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-semibold text-foreground">
          {settingsContent.paymentSetup.stripeCallbackFailed}
        </h1>
        <p className="mt-3 text-sm text-muted">{error}</p>
        <button
          type="button"
          onClick={() => navigate(target.path, { replace: true })}
          className="mt-6 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-white"
        >
          {target.fromSetup ? settingsContent.paymentSetup.stripeCallbackBackSetup : settingsContent.paymentSetup.stripeCallbackBack}
        </button>
      </div>
    </main>
  )
}
