import { beforeAll, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import Login from '@/pages/Login'
import { setRememberSession, supabase } from '@/lib/supabase'
import { renderWithProviders } from '@/test/render'

describe('Login remember me', () => {
  beforeAll(() => {
    // jsdom has no matchMedia (the auth layout reads it).
    window.matchMedia ??= ((query: string) => ({
      matches: false,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      onchange: null,
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia
  })

  it('is on by default and chooses the session store before signing in', async () => {
    const signIn = vi.fn().mockResolvedValue({ error: null })
    const oauth = vi.fn().mockResolvedValue({ error: null })
    Object.assign(supabase.auth, { signInWithPassword: signIn, signInWithOAuth: oauth })
    const { user } = renderWithProviders(<Login />)

    const remember = screen.getByRole('checkbox', { name: 'Remember me' })
    expect(remember).toBeChecked()
    await user.type(screen.getByPlaceholderText('name@company.com'), 'jo@example.com')
    await user.type(screen.getByPlaceholderText('••••••••'), 'secret')
    await user.click(remember)
    await user.click(screen.getByRole('button', { name: 'Sign in' }))
    await waitFor(() => expect(signIn).toHaveBeenCalled())
    expect(setRememberSession).toHaveBeenLastCalledWith(false)

    await user.click(remember)
    await user.click(screen.getByRole('button', { name: /google/i }))
    await waitFor(() => expect(oauth).toHaveBeenCalled())
    expect(setRememberSession).toHaveBeenLastCalledWith(true)
  })
})
