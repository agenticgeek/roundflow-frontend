import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { ROUTES } from '@/config/routes'

const auth = vi.hoisted(() => ({
  session: null as object | null,
  loading: false,
  justProvisioned: false,
}))
vi.mock('@/lib/auth', () => ({ useAuth: () => auth }))

const { GuestRoute, IntegrationsReturnRoute, ProtectedRoute, StripeCallbackRoute } = await import(
  '@/providers/RouteGuards'
)
const { setBootstrap } = await import('@/test/bootstrap')

function Where() {
  const location = useLocation()
  return (
    <p data-testid="where">
      {location.pathname}
      {location.search}
    </p>
  )
}

function Login() {
  const location = useLocation()
  const from = (location.state as { from?: { pathname: string; search: string } } | null)?.from
  return <p data-testid="login">{from ? `from ${from.pathname}${from.search}` : 'no from'}</p>
}

function renderApp(initial: string, state?: unknown) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: initial.split('?')[0]!, search: initial.includes('?') ? `?${initial.split('?')[1]}` : '', state }]}>
      <Routes>
        <Route path={ROUTES.login} element={<GuestRoute><Login /></GuestRoute>} />
        <Route path={ROUTES.customers} element={<ProtectedRoute><p>customers page</p></ProtectedRoute>} />
        <Route path={ROUTES.settingsIntegrations} element={<IntegrationsReturnRoute><p>integrations page</p></IntegrationsReturnRoute>} />
        <Route path={ROUTES.stripeCallback} element={<StripeCallbackRoute><p>stripe page</p></StripeCallbackRoute>} />
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  )
}

function reset() {
  auth.session = null
  auth.loading = false
  auth.justProvisioned = false
}

describe('deep link preservation (WEB-04)', () => {
  it('sends a signed-out user to Login carrying where they were going', () => {
    reset()
    renderApp('/customers?tab=debt')
    expect(screen.getByTestId('login')).toHaveTextContent('from /customers?tab=debt')
  })

  it('carries the location from the integrations return and Stripe callback guards too', () => {
    reset()
    renderApp('/settings/integrations?stripe=connected')
    expect(screen.getByTestId('login')).toHaveTextContent('from /settings/integrations?stripe=connected')
  })

  it('sends a signed-out user hitting the Stripe callback to Login with it', () => {
    reset()
    renderApp(ROUTES.stripeCallback)
    expect(screen.getByTestId('login')).toHaveTextContent(`from ${ROUTES.stripeCallback}`)
  })

  it('after sign-in, Login sends the user to the page they asked for', () => {
    reset()
    auth.session = {}
    renderApp(ROUTES.login, { from: { pathname: '/customers', search: '?tab=debt' } })
    expect(screen.getByText('customers page')).toBeInTheDocument()
  })

  it('ignores an external or malformed from, and a missing one', () => {
    reset()
    auth.session = {}
    const first = renderApp(ROUTES.login, { from: { pathname: '//evil.example' } })
    expect(screen.queryByText('customers page')).not.toBeInTheDocument()
    first.unmount()
    renderApp(ROUTES.login)
    expect(screen.queryByText('customers page')).not.toBeInTheDocument()
  })

  it('uses the path saved by an expired session when there is no router state, once', () => {
    reset()
    auth.session = {}
    sessionStorage.setItem('rf-return-to', '/customers')
    renderApp(ROUTES.login)
    expect(screen.getByText('customers page')).toBeInTheDocument()
    expect(sessionStorage.getItem('rf-return-to')).toBeNull()
  })

  it('still routes technicians and unfinished setups to their own place', () => {
    reset()
    auth.session = {}
    setBootstrap({ isTechnician: true })
    const first = renderApp(ROUTES.login, { from: { pathname: '/customers' } })
    expect(screen.getByTestId('where')).toHaveTextContent(ROUTES.technicianApp)
    first.unmount()

    setBootstrap({ isTechnician: false, setupCompleted: false })
    const second = renderApp(ROUTES.login, { from: { pathname: '/customers' } })
    expect(screen.getByTestId('where')).toHaveTextContent(ROUTES.setupWizard)
    second.unmount()

    setBootstrap({ setupCompleted: true })
    auth.justProvisioned = true
    renderApp(ROUTES.login, { from: { pathname: '/customers' } })
    expect(screen.getByTestId('where')).toHaveTextContent(ROUTES.setupWizard)
  })
})
