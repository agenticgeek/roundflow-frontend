import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import { renderWithProviders } from '@/test/render'
import { server } from '@/test/msw/server'
import { API } from '@/test/msw/typed'

// Supabase: the invite email's link signs the invitee in; this page then only sets the password.
const { auth, ctx } = vi.hoisted(() => ({
  auth: {
    setSession: vi.fn(),
    exchangeCodeForSession: vi.fn(),
    getSession: vi.fn(),
    updateUser: vi.fn(),
    signInWithOtp: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
  },
  ctx: { session: null as { access_token: string; user: { email: string } } | null },
}))

vi.mock('@/lib/supabase', () => ({
  getCachedAccessToken: () => 'test-token',
  refreshAccessToken: async () => 'test-token',
  supabase: { auth },
}))

vi.mock('@/lib/auth', () => ({
  useAuth: () => ({ session: ctx.session, loading: false }),
}))

import TechnicianSetup from '@/pages/TechnicianSetup'

const INVITE = {
  email: 'sam@example.com',
  role: 'TECHNICIAN',
  tenantId: 'tn1',
  expiresAt: '2026-11-06T00:00:00.000Z',
}

const LINK_HASH = '#access_token=at&refresh_token=rt'

function serveInvite(accept: () => Response = () => HttpResponse.json({ profile: { id: 'p1' } }, { status: 201 })) {
  const accepted = vi.fn()
  server.use(
    http.get(`${API}/invites/:token`, () => HttpResponse.json(INVITE)),
    http.post(`${API}/invites/:token/accept`, async ({ request }) => {
      accepted(request.headers.get('authorization'), await request.json())
      return accept()
    }),
  )
  return accepted
}

type User = ReturnType<typeof renderWithProviders>['user']

async function reachCredentials(user: User) {
  await user.click(await screen.findByRole('button', { name: 'Set up my login' }))
  await screen.findByRole('heading', { name: 'Create your login' })
}

async function fillAndSubmit(user: User) {
  // The page pre-fills the name from the email; select it and type over it.
  await user.tripleClick(screen.getByLabelText(/full name/i))
  await user.keyboard('Sam Cleaner')
  await user.type(screen.getByPlaceholderText('At least 8 characters'), 'Window123')
  await user.type(screen.getByPlaceholderText('Type it again'), 'Window123')
  await user.click(screen.getByRole('button', { name: 'Create login' }))
}

const signedIn = { access_token: 'at', user: { email: 'sam@example.com' } }

beforeEach(() => {
  // jsdom has no matchMedia; the invite layout asks for prefers-reduced-motion.
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
  ctx.session = null
  for (const fn of Object.values(auth)) fn.mockReset()
  auth.setSession.mockResolvedValue({ error: null })
  auth.getSession.mockResolvedValue({ data: { session: null } })
  auth.updateUser.mockResolvedValue({ error: null })
  auth.signInWithOtp.mockResolvedValue({ error: null })
  window.history.replaceState({}, '', '/app-invite?token=tok')
})

describe('TechnicianSetup (/app-invite)', () => {
  it('signed in from the email link: SETS the password on that account, accepts, and never signs up', async () => {
    window.history.replaceState({}, '', `/app-invite?token=tok${LINK_HASH}`)
    ctx.session = signedIn
    const accepted = serveInvite()
    const { user } = renderWithProviders(<TechnicianSetup />, { route: '/app-invite?token=tok' })

    await reachCredentials(user)
    await fillAndSubmit(user)

    await waitFor(() => expect(accepted).toHaveBeenCalledWith('Bearer at', { name: 'Sam Cleaner' }))
    expect(auth.setSession).toHaveBeenCalledWith({ access_token: 'at', refresh_token: 'rt' })
    expect(auth.updateUser).toHaveBeenCalledWith({ password: 'Window123', data: { full_name: 'Sam Cleaner' } })
    expect(auth.signUp).not.toHaveBeenCalled()
    expect(await screen.findByText(/you’re all set, sam$/i)).toBeInTheDocument()
  })

  it('uses the session Supabase holds even if React state has not caught up yet', async () => {
    window.history.replaceState({}, '', `/app-invite?token=tok${LINK_HASH}`)
    ctx.session = null // the auth context lags a render behind the link sign-in
    auth.getSession.mockResolvedValue({ data: { session: { access_token: 'fresh' } } })
    const accepted = serveInvite()
    const { user } = renderWithProviders(<TechnicianSetup />, { route: '/app-invite?token=tok' })

    await reachCredentials(user)
    await fillAndSubmit(user)

    await waitFor(() => expect(accepted).toHaveBeenCalledWith('Bearer fresh', { name: 'Sam Cleaner' }))
    expect(auth.signUp).not.toHaveBeenCalled()
  })

  it('not signed in and no email link: asks for the link up front instead of a sign-up form, and never signs up', async () => {
    serveInvite()
    renderWithProviders(<TechnicianSetup />, { route: '/app-invite?token=tok' })

    expect(await screen.findByRole('heading', { name: 'Open the link from your email' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Create your login' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Set up my login' })).not.toBeInTheDocument()
    expect(auth.signUp).not.toHaveBeenCalled()
  })

  it('"Email me a new link" sends a sign-in link only to the existing invited account', async () => {
    serveInvite()
    const { user } = renderWithProviders(<TechnicianSetup />, { route: '/app-invite?token=tok' })

    await user.click(await screen.findByRole('button', { name: 'Email me a new link' }))

    await waitFor(() =>
      expect(auth.signInWithOtp).toHaveBeenCalledWith({
        email: 'sam@example.com',
        options: { shouldCreateUser: false, emailRedirectTo: `${window.location.origin}/app-invite?token=tok` },
      }),
    )
    expect(await screen.findByRole('heading', { name: 'Check your email' })).toBeInTheDocument()
    expect(auth.signUp).not.toHaveBeenCalled()
  })

  it('shows Supabase’s message when a fresh link cannot be sent', async () => {
    auth.signInWithOtp.mockResolvedValue({ error: new Error('Signups not allowed for otp') })
    serveInvite()
    const { user } = renderWithProviders(<TechnicianSetup />, { route: '/app-invite?token=tok' })

    await user.click(await screen.findByRole('button', { name: 'Email me a new link' }))

    expect(await screen.findByText('Signups not allowed for otp')).toBeInTheDocument()
  })

  it('an expired email link offers a fresh one', async () => {
    window.history.replaceState({}, '', '/app-invite?token=tok#error=access_denied&error_code=otp_expired')
    serveInvite()
    renderWithProviders(<TechnicianSetup />, { route: '/app-invite?token=tok' })

    expect(await screen.findByRole('heading', { name: 'Your email link has expired' })).toBeInTheDocument()
  })

  it('if the session disappears before submit, goes to the open-the-link state (still no sign-up)', async () => {
    window.history.replaceState({}, '', `/app-invite?token=tok${LINK_HASH}`)
    ctx.session = null
    auth.getSession.mockResolvedValue({ data: { session: null } })
    serveInvite()
    const { user } = renderWithProviders(<TechnicianSetup />, { route: '/app-invite?token=tok' })

    await reachCredentials(user)
    await fillAndSubmit(user)

    expect(await screen.findByRole('heading', { name: 'Open the link from your email' })).toBeInTheDocument()
    expect(auth.updateUser).not.toHaveBeenCalled()
    expect(auth.signUp).not.toHaveBeenCalled()
  })

  it('shows the error when the password cannot be saved, and does not accept the invite', async () => {
    window.history.replaceState({}, '', `/app-invite?token=tok${LINK_HASH}`)
    ctx.session = signedIn
    auth.updateUser.mockResolvedValue({ error: new Error('New password should be different') })
    const accepted = serveInvite()
    const { user } = renderWithProviders(<TechnicianSetup />, { route: '/app-invite?token=tok' })

    await reachCredentials(user)
    await fillAndSubmit(user)

    expect(await screen.findByText('New password should be different')).toBeInTheDocument()
    expect(accepted).not.toHaveBeenCalled()
  })

  it('an already-used invite (410) is reported', async () => {
    window.history.replaceState({}, '', `/app-invite?token=tok${LINK_HASH}`)
    ctx.session = signedIn
    serveInvite(() => HttpResponse.json({ error: 'Invite has already been accepted' }, { status: 410 }))
    const { user } = renderWithProviders(<TechnicianSetup />, { route: '/app-invite?token=tok' })

    await reachCredentials(user)
    await fillAndSubmit(user)

    expect(await screen.findByText(/already/i)).toBeInTheDocument()
  })
})
