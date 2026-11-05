/**
 * Stripe Connect OAuth, driven from the browser so the Supabase token always travels in the
 * `Authorization` header — never in a URL.
 *
 * 1. `beginStripeConnect()` builds Stripe's consent URL here (client_id is public) with a random
 *    `state` kept in sessionStorage, instead of navigating through the API's /settings/stripe/authorize.
 * 2. Stripe sends the admin back to ROUTES.stripeCallback (must be a registered redirect URI in
 *    Stripe → Connect → Settings). That page checks `state` with `consumeStripeState()` and calls
 *    GET /settings/stripe/callback with a bearer header (settingsApi.completeStripeConnect).
 */
import { ROUTES } from '@/config/routes'

const STRIPE_AUTHORIZE_URL = 'https://connect.stripe.com/oauth/authorize'
export const STRIPE_STATE_KEY = 'rf.stripeConnectState'

export function stripeConnectClientId(): string {
  const clientId = import.meta.env.VITE_STRIPE_CONNECT_CLIENT_ID
  if (!clientId) {
    throw new Error('Stripe isn\'t configured yet (missing VITE_STRIPE_CONNECT_CLIENT_ID).')
  }
  return clientId
}

export function stripeRedirectUri(origin: string = window.location.origin): string {
  return `${origin}${ROUTES.stripeCallback}`
}

export function buildStripeConnectUrl(input: { clientId: string; redirectUri: string; state: string }): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: input.clientId,
    scope: 'read_write',
    redirect_uri: input.redirectUri,
    state: input.state,
  })
  return `${STRIPE_AUTHORIZE_URL}?${params.toString()}`
}

function randomState(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

/** Stores a fresh `state` and returns the Stripe consent URL to navigate to. */
export function beginStripeConnect(): string {
  const clientId = stripeConnectClientId()
  const state = randomState()
  sessionStorage.setItem(STRIPE_STATE_KEY, state)
  return buildStripeConnectUrl({ clientId, redirectUri: stripeRedirectUri(), state })
}

export type StripeCallbackParams =
  | { kind: 'exchange'; code: string; state: string }
  | { kind: 'error'; message: string }

/** Reads Stripe's redirect query (`?code&state` or `?error&error_description`) and checks `state`. */
export function parseStripeCallback(search: string): StripeCallbackParams {
  const params = new URLSearchParams(search)
  const providerError = params.get('error_description') ?? params.get('error')
  if (providerError) return { kind: 'error', message: providerError }

  const code = params.get('code')
  const state = params.get('state')
  if (!consumeStripeState(state)) {
    return { kind: 'error', message: 'This Stripe connection link has expired. Start again from Settings.' }
  }
  if (!code) return { kind: 'error', message: 'Stripe didn\'t return an authorisation code.' }
  return { kind: 'exchange', code, state: state as string }
}

/** True when `state` matches the one this tab started with. Single use — always cleared. */
export function consumeStripeState(state: string | null): boolean {
  const expected = sessionStorage.getItem(STRIPE_STATE_KEY)
  sessionStorage.removeItem(STRIPE_STATE_KEY)
  return Boolean(state) && state === expected
}
