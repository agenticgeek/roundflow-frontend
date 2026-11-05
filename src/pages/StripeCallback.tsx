import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { settingsApi } from '@/api/settings.api'
import { FullScreenLoader } from '@/components/FullScreenLoader'
import { ROUTES } from '@/config/routes'
import { settingsContent } from '@/content/settings'
import { errorMessage } from '@/lib/errors'
import { parseStripeCallback } from '@/lib/stripe-connect'

/**
 * Stripe Connect redirect URI. Finishes the OAuth exchange through the API with the admin's
 * bearer token, then hands over to /settings/integrations?stripe=connected (which reopens the
 * setup wizard's Payments step when setup isn't finished).
 */
export default function StripeCallback() {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  // Stripe's code is single use; StrictMode's double effect must not exchange it twice.
  const started = useRef(false)

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
      .then(() => navigate(`${ROUTES.settingsIntegrations}?stripe=connected`, { replace: true }))
      .catch((err: unknown) => setError(errorMessage(err)))
  }, [navigate])

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
          onClick={() => navigate(ROUTES.settingsIntegrations, { replace: true })}
          className="mt-6 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-white"
        >
          {settingsContent.paymentSetup.stripeCallbackBack}
        </button>
      </div>
    </main>
  )
}
