import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '@/test/render'

const { auth } = vi.hoisted(() => ({
  auth: { verifyOtp: vi.fn(), exchangeCodeForSession: vi.fn(), getSession: vi.fn() },
}))

vi.mock('@/lib/supabase', () => ({
  getCachedAccessToken: () => 'test-token',
  refreshAccessToken: async () => 'test-token',
  supabase: { auth },
}))

import ResetPassword from '@/pages/ResetPassword'

beforeEach(() => {
  auth.verifyOtp.mockReset().mockResolvedValue({ error: null })
  auth.exchangeCodeForSession.mockReset().mockResolvedValue({ error: null })
  auth.getSession.mockReset().mockResolvedValue({ data: { session: null } })
})

function open(query: string) {
  window.history.replaceState({}, '', `/reset-password${query}`)
  return renderWithProviders(<ResetPassword />, { route: `/reset-password${query}` })
}

describe('ResetPassword link handling', () => {
  it('a token-hash recovery link opens the new-password form in any browser', async () => {
    open('?token_hash=th&type=recovery')
    expect(await screen.findByRole('button', { name: 'Reset password' })).toBeInTheDocument()
    expect(auth.verifyOtp).toHaveBeenCalledWith({ token_hash: 'th', type: 'recovery' })
  })

  it('shows Supabase’s reason when the link is rejected', async () => {
    auth.verifyOtp.mockResolvedValue({ error: new Error('Token has expired or is invalid') })
    open('?token_hash=th&type=recovery')
    expect(await screen.findByText('Token has expired or is invalid')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Reset password' })).not.toBeInTheDocument()
  })

  it('still exchanges a PKCE code', async () => {
    open('?code=c1')
    await waitFor(() => expect(auth.exchangeCodeForSession).toHaveBeenCalledWith('c1'))
    expect(await screen.findByRole('button', { name: 'Reset password' })).toBeInTheDocument()
  })

  it('without a link or a session, says the link is invalid', async () => {
    open('')
    expect(await screen.findByText('This password reset link is invalid or has expired.')).toBeInTheDocument()
  })
})
