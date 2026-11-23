import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '@/test/render'

const { auth, authCtx } = vi.hoisted(() => ({
  auth: { verifyOtp: vi.fn(), exchangeCodeForSession: vi.fn(), getSession: vi.fn() },
  authCtx: { session: null as { access_token: string } | null },
}))

vi.mock('@/lib/supabase', () => ({
  getCachedAccessToken: () => 'test-token',
  refreshAccessToken: async () => 'test-token',
  supabase: { auth },
}))
vi.mock('@/lib/auth', () => ({
  useAuth: () => ({ session: authCtx.session, loading: false, justProvisioned: true }),
}))
vi.mock('@/providers/AppBootstrapProvider', () => ({
  useAppBootstrap: () => ({ ready: true, setupCompleted: false }),
}))

import AuthCallback from '@/pages/AuthCallback'

beforeEach(() => {
  authCtx.session = null
  auth.verifyOtp.mockReset().mockResolvedValue({ error: null })
  auth.exchangeCodeForSession.mockReset().mockResolvedValue({ error: null })
  auth.getSession.mockReset().mockResolvedValue({ data: { session: null } })
})

function open(query: string) {
  window.history.replaceState({}, '', `/auth/callback${query}`)
  return renderWithProviders(<AuthCallback />, { route: `/auth/callback${query}` })
}

describe('AuthCallback', () => {
  it('confirms a sign-up from a token-hash link, without the browser that signed up', async () => {
    open('?token_hash=th&type=signup')
    await waitFor(() => expect(auth.verifyOtp).toHaveBeenCalledWith({ token_hash: 'th', type: 'signup' }))
    expect(auth.exchangeCodeForSession).not.toHaveBeenCalled()
    expect(screen.queryByText('Unable to complete sign in')).not.toBeInTheDocument()
  })

  it('shows Supabase’s reason when the link cannot be used', async () => {
    auth.verifyOtp.mockResolvedValue({ error: new Error('Token has expired or is invalid') })
    open('?token_hash=th&type=signup')
    expect(await screen.findByText('Token has expired or is invalid')).toBeInTheDocument()
  })

  it('still exchanges a PKCE code', async () => {
    open('?code=c1')
    await waitFor(() => expect(auth.exchangeCodeForSession).toHaveBeenCalledWith('c1'))
  })

  it('without a link or a session, says the link is invalid', async () => {
    open('')
    expect(await screen.findByText('This sign-in link is invalid or has expired.')).toBeInTheDocument()
  })

  it('shows the provider error from the URL', async () => {
    open('?error_description=Email%20link%20is%20invalid')
    expect(await screen.findByText('Email link is invalid')).toBeInTheDocument()
    expect(auth.verifyOtp).not.toHaveBeenCalled()
  })
})
