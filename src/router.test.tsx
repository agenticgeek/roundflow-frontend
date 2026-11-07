import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ROUTES } from '@/config/routes'

const auth = vi.hoisted(() => ({ session: null as object | null, loading: false }))
vi.mock('@/lib/auth', () => ({ useAuth: () => auth, AuthProvider: ({ children }: { children: unknown }) => children }))

const { routes } = await import('@/router')
const { StripeCallbackRoute } = await import('@/providers/RouteGuards')
const { setBootstrap } = await import('@/test/bootstrap')

describe('router (GAP-024)', () => {
  it('gives every route an error boundary', () => {
    expect(routes.length).toBeGreaterThan(10)
    for (const route of routes) expect(route.errorElement).toBeTruthy()
    expect(routes.some((route) => route.path === ROUTES.stripeCallback)).toBe(true)
  })
})

describe('StripeCallbackRoute', () => {
  function renderGuard() {
    return render(
      <MemoryRouter>
        {/* The guard must sit on a route: its redirect to Login carries the current location. */}
        <Routes>
          <Route
            path="/"
            element={
              <StripeCallbackRoute>
                <p>callback page</p>
              </StripeCallbackRoute>
            }
          />
          <Route path={ROUTES.login} element={<p>login page</p>} />
          <Route path={ROUTES.technicianApp} element={<p>technician page</p>} />
        </Routes>
      </MemoryRouter>,
    )
  }

  it('waits for auth, sends signed-out users to login and technicians to their app', () => {
    auth.loading = true
    const { container, unmount } = renderGuard()
    expect(container).toBeEmptyDOMElement()
    unmount()

    auth.loading = false
    auth.session = null
    const signedOut = renderGuard()
    expect(screen.getByText('login page')).toBeInTheDocument()
    signedOut.unmount()

    auth.session = {}
    setBootstrap({ isTechnician: true })
    const technician = renderGuard()
    expect(screen.getByText('technician page')).toBeInTheDocument()
    technician.unmount()

    setBootstrap({ isTechnician: false })
    renderGuard()
    expect(screen.getByText('callback page')).toBeInTheDocument()
  })
})
