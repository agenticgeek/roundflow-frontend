import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
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
        <StripeCallbackRoute>
          <p>callback page</p>
        </StripeCallbackRoute>
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
    renderGuard().unmount()

    auth.session = {}
    setBootstrap({ isTechnician: true })
    renderGuard().unmount()

    setBootstrap({ isTechnician: false })
    renderGuard()
    expect(screen.getByText('callback page')).toBeInTheDocument()
  })
})
