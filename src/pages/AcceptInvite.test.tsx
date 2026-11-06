import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { on } from '@/test/msw/typed'
import { renderWithProviders } from '@/test/render'

vi.mock('@/lib/auth', () => ({
  useAuth: () => ({ session: null, loading: false }),
}))

import AcceptInvite from '@/pages/AcceptInvite'

beforeEach(() => {
  // jsdom has no matchMedia; the auth layout asks for prefers-reduced-motion.
  window.matchMedia = ((query: string) => ({
    matches: true,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    onchange: null,
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia
})

describe('AcceptInvite lookup errors (Wave 2B-1)', () => {
  it('429 on the public invite lookup says how long to wait, in plain words', async () => {
    server.use(
      on('get', '/invites/{token}', () =>
        HttpResponse.json({ error: 'Too many requests', code: 'RATE_LIMITED' }, { status: 429, headers: { 'Retry-After': '30' } }),
      ),
    )
    renderWithProviders(<AcceptInvite />, { route: '/accept-invite?token=abc' })
    expect(await screen.findByText('Too many attempts. Try again in 30 seconds.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to log in' })).toBeInTheDocument()
  })
})
