import { beforeEach, describe, expect, it, vi } from 'vitest'

const { auth } = vi.hoisted(() => ({
  auth: { verifyOtp: vi.fn(), exchangeCodeForSession: vi.fn() },
}))

vi.mock('@/lib/supabase', () => ({ supabase: { auth } }))

import { sessionFromEmailLink } from '@/lib/email-link'

const params = (query: string) => new URLSearchParams(query)

beforeEach(() => {
  auth.verifyOtp.mockReset().mockResolvedValue({ error: null })
  auth.exchangeCodeForSession.mockReset().mockResolvedValue({ error: null })
})

describe('sessionFromEmailLink', () => {
  it('verifies a token-hash link with verifyOtp, so it works in a different browser', async () => {
    await expect(sessionFromEmailLink(params('?token_hash=th&type=signup'))).resolves.toEqual({ error: null })
    expect(auth.verifyOtp).toHaveBeenCalledWith({ token_hash: 'th', type: 'signup' })
    expect(auth.exchangeCodeForSession).not.toHaveBeenCalled()
  })

  it('passes on the message when Supabase rejects the token hash', async () => {
    auth.verifyOtp.mockResolvedValue({ error: new Error('Token has expired or is invalid') })
    await expect(sessionFromEmailLink(params('?token_hash=th&type=recovery'))).resolves.toEqual({
      error: 'Token has expired or is invalid',
    })
  })

  it('rejects a token hash with a missing or unknown type without calling Supabase', async () => {
    await expect(sessionFromEmailLink(params('?token_hash=th'))).resolves.toEqual({
      error: 'This link is invalid or has expired.',
    })
    await expect(sessionFromEmailLink(params('?token_hash=th&type=sms'))).resolves.toEqual({
      error: 'This link is invalid or has expired.',
    })
    expect(auth.verifyOtp).not.toHaveBeenCalled()
  })

  it('still exchanges a PKCE code (Google sign-in, older emails)', async () => {
    await expect(sessionFromEmailLink(params('?code=c1'))).resolves.toEqual({ error: null })
    expect(auth.exchangeCodeForSession).toHaveBeenCalledWith('c1')

    auth.exchangeCodeForSession.mockResolvedValue({ error: new Error('code verifier not found in storage') })
    await expect(sessionFromEmailLink(params('?code=c2'))).resolves.toEqual({
      error: 'code verifier not found in storage',
    })
  })

  it('returns null when the URL holds no link', async () => {
    await expect(sessionFromEmailLink(params('?invite_token=x'))).resolves.toBeNull()
    expect(auth.verifyOtp).not.toHaveBeenCalled()
    expect(auth.exchangeCodeForSession).not.toHaveBeenCalled()
  })
})
