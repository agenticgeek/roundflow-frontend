import { afterEach, describe, expect, it, vi } from 'vitest'
import { STRIPE_STATE_KEY } from '@/lib/stripe-connect'

vi.mock('@/lib/supabase', () => ({
  getCachedAccessToken: () => 'tok_123',
  refreshAccessToken: async () => 'tok_123',
}))

const { settingsApi } = await import('@/api/settings.api')

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('Stripe Connect API calls', () => {
  it('stripeAuthorizeUrl goes straight to Stripe and never carries the access token', () => {
    vi.stubEnv('VITE_STRIPE_CONNECT_CLIENT_ID', 'ca_test')
    const url = settingsApi.stripeAuthorizeUrl()
    expect(url.startsWith('https://connect.stripe.com/oauth/authorize?')).toBe(true)
    expect(url).not.toContain('tok_123')
    expect(url).not.toContain('access_token')
    expect(sessionStorage.getItem(STRIPE_STATE_KEY)).toBeTruthy()
  })

  it('completeStripeConnect sends the token in the Authorization header and treats the redirect as success', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ type: 'opaqueredirect', status: 0, ok: false })
    vi.stubGlobal('fetch', fetchMock)

    await expect(settingsApi.completeStripeConnect('ac_1', 's t')).resolves.toBeUndefined()

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit & { headers: Record<string, string> }]
    expect(url).toMatch(/\/settings\/stripe\/callback\?code=ac_1&state=s\+t$/)
    expect(url).not.toContain('tok_123')
    expect(init.redirect).toBe('manual')
    expect(init.headers.Authorization).toBe('Bearer tok_123')
  })

  it('completeStripeConnect surfaces the API error message', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        type: 'cors',
        status: 400,
        ok: false,
        json: async () => ({ error: 'Missing code or state from Stripe' }),
      }),
    )

    await expect(settingsApi.completeStripeConnect('ac_1', 'st')).rejects.toMatchObject({
      status: 400,
      message: 'Missing code or state from Stripe',
    })
  })
})
