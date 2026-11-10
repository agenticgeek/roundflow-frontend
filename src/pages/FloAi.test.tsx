import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { useLocation } from 'react-router-dom'
import { screen } from '@testing-library/react'
import { setBootstrap } from '@/test/bootstrap'
import { renderWithProviders } from '@/test/render'

vi.mock('@/components/app/AppShell', () => ({
  AppShell: ({ children, onSignOut }: { children: ReactNode; onSignOut: () => void }) => {
    const location = useLocation()
    return (
      <main>
        <p>{`at ${location.pathname}`}</p>
        <button type="button" onClick={onSignOut}>
          sign out
        </button>
        {children}
      </main>
    )
  },
}))
vi.mock('@/hooks/use-app-quick-actions', () => ({ useAppQuickActions: () => ({}) }))

const { default: FloAi } = await import('@/pages/FloAi')

describe('Flo AI page', () => {
  it('shows Flo to an administrator', async () => {
    setBootstrap({ role: 'ADMIN' })
    renderWithProviders(<FloAi />, { route: '/flo' })
    expect(screen.getByRole('heading', { name: 'Flo AI' })).toBeInTheDocument()
    expect(await screen.findByRole('textbox', { name: 'Ask Flo' })).toBeInTheDocument()
  })

  it('shows the admin-only note to a manager, and no Flo controls', () => {
    setBootstrap({ role: 'MANAGER' })
    renderWithProviders(<FloAi />, { route: '/flo' })
    expect(screen.getByText('Flo AI is only available to administrators.')).toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })

  it('signs out to the login screen', async () => {
    setBootstrap({ role: 'ADMIN' })
    const { user } = renderWithProviders(<FloAi />, { route: '/flo' })
    await user.click(screen.getByRole('button', { name: 'sign out' }))
    expect(await screen.findByText('at /login')).toBeInTheDocument()
  })
})
