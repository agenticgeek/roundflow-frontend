import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  STRIPE_STATE_KEY,
  beginStripeConnect,
  buildStripeConnectUrl,
  consumeStripeState,
  parseStripeCallback,
  stripeConnectClientId,
  stripeRedirectUri,
} from '@/lib/stripe-connect'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('stripeConnectClientId', () => {
  it('returns the configured client id', () => {
    vi.stubEnv('VITE_STRIPE_CONNECT_CLIENT_ID', 'ca_test')
    expect(stripeConnectClientId()).toBe('ca_test')
  })

  it('throws a readable error when it is missing', () => {
    vi.stubEnv('VITE_STRIPE_CONNECT_CLIENT_ID', '')
    expect(() => stripeConnectClientId()).toThrow(/VITE_STRIPE_CONNECT_CLIENT_ID/)
  })
})

describe('stripeRedirectUri', () => {
  it('uses the given origin', () => {
    expect(stripeRedirectUri('https://www.roundflow.ai')).toBe(
      'https://www.roundflow.ai/settings/stripe/callback',
    )
  })

  it('defaults to the current origin', () => {
    expect(stripeRedirectUri()).toBe(`${window.location.origin}/settings/stripe/callback`)
  })
})

describe('buildStripeConnectUrl', () => {
  it('builds the consent URL with no access token in it', () => {
    const url = new URL(
      buildStripeConnectUrl({ clientId: 'ca_1', redirectUri: 'https://app/cb', state: 's1' }),
    )
    expect(url.origin + url.pathname).toBe('https://connect.stripe.com/oauth/authorize')
    expect(Object.fromEntries(url.searchParams)).toEqual({
      response_type: 'code',
      client_id: 'ca_1',
      scope: 'read_write',
      redirect_uri: 'https://app/cb',
      state: 's1',
    })
    expect(url.search).not.toContain('access_token')
  })
})

describe('beginStripeConnect', () => {
  it('stores a random state and puts it in the URL', () => {
    vi.stubEnv('VITE_STRIPE_CONNECT_CLIENT_ID', 'ca_test')
    const url = new URL(beginStripeConnect())
    const state = url.searchParams.get('state')
    expect(state).toMatch(/^[0-9a-f]{32}$/)
    expect(sessionStorage.getItem(STRIPE_STATE_KEY)).toBe(state)
    expect(url.searchParams.get('redirect_uri')).toBe(stripeRedirectUri())
  })

  it('does not store state when the client id is missing', () => {
    vi.stubEnv('VITE_STRIPE_CONNECT_CLIENT_ID', '')
    expect(() => beginStripeConnect()).toThrow()
    expect(sessionStorage.getItem(STRIPE_STATE_KEY)).toBeNull()
  })
})

describe('consumeStripeState', () => {
  it('accepts the matching state once', () => {
    sessionStorage.setItem(STRIPE_STATE_KEY, 'abc')
    expect(consumeStripeState('abc')).toBe(true)
    expect(consumeStripeState('abc')).toBe(false)
  })

  it('rejects a mismatched or missing state and clears storage', () => {
    sessionStorage.setItem(STRIPE_STATE_KEY, 'abc')
    expect(consumeStripeState('xyz')).toBe(false)
    expect(sessionStorage.getItem(STRIPE_STATE_KEY)).toBeNull()
    expect(consumeStripeState(null)).toBe(false)
  })
})

describe('parseStripeCallback', () => {
  it('returns the code and state when state matches', () => {
    sessionStorage.setItem(STRIPE_STATE_KEY, 'st')
    expect(parseStripeCallback('?code=ac_1&state=st')).toEqual({
      kind: 'exchange',
      code: 'ac_1',
      state: 'st',
    })
  })

  it('prefers error_description from Stripe', () => {
    expect(parseStripeCallback('?error=access_denied&error_description=User%20denied')).toEqual({
      kind: 'error',
      message: 'User denied',
    })
  })

  it('falls back to the error code', () => {
    expect(parseStripeCallback('?error=access_denied')).toEqual({
      kind: 'error',
      message: 'access_denied',
    })
  })

  it('rejects a state this tab did not start', () => {
    sessionStorage.setItem(STRIPE_STATE_KEY, 'mine')
    const result = parseStripeCallback('?code=ac_1&state=forged')
    expect(result).toEqual({ kind: 'error', message: expect.stringMatching(/expired/) })
  })

  it('rejects a missing code', () => {
    sessionStorage.setItem(STRIPE_STATE_KEY, 'st')
    expect(parseStripeCallback('?state=st')).toEqual({
      kind: 'error',
      message: expect.stringMatching(/authorisation code/),
    })
  })
})
