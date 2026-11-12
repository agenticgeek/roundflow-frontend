import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { AppShell } from '@/components/app/AppShell'
import { AppSidebarNav } from '@/components/app/AppSidebar'
import { appShellContent } from '@/content/app-shell'
import { resetNavBadgeSession } from '@/lib/nav-badge'
import { setBootstrap } from '@/test/bootstrap'
import { renderWithProviders } from '@/test/render'

const quickActions = {
  handleQuickAction: vi.fn(),
  bulkMessageModalOpen: false,
  closeBulkMessageModal: vi.fn(),
  addRoundModalOpen: false,
  closeAddRoundModal: vi.fn(),
  addPropertyModalOpen: false,
  closeAddPropertyModal: vi.fn(),
  addOneOffJobModalOpen: false,
  closeAddOneOffJobModal: vi.fn(),
} as unknown as Parameters<typeof AppShell>[0]['quickActions']

function renderShell() {
  return renderWithProviders(
    <AppShell quickActions={quickActions}>
      <p>page body</p>
    </AppShell>,
  )
}

const floLink = () => screen.queryByRole('link', { name: /Flo AI/ })

beforeEach(() => {
  localStorage.clear()
  resetNavBadgeSession()
})

afterEach(() => vi.restoreAllMocks())

describe('Flo AI nav item', () => {
  it('sits under Technicians for an admin, with a NEW badge that goes away once opened', async () => {
    setBootstrap({ role: 'ADMIN' })
    const { user } = renderShell()
    const links = screen.getAllByRole('link').map((link) => link.textContent)
    const technicians = links.findIndex((text) => text?.startsWith('Technicians'))
    expect(links[technicians + 1]).toBe('Flo AINEW')
    expect(floLink()).toHaveAttribute('href', '/flo')

    await user.click(floLink() as HTMLElement)
    expect(floLink()).toHaveTextContent(/^Flo AI$/)
    expect(localStorage.getItem('roundflow.nav-badge.anon.flo-ai')).toBe('1')
  })

  it('stays dismissed on the next visit, even when storage is blocked for writing', async () => {
    localStorage.setItem('roundflow.nav-badge.anon.flo-ai', '1')
    setBootstrap({ role: 'ADMIN' })
    renderShell()
    expect(floLink()).toHaveTextContent(/^Flo AI$/)
  })

  it('still dismisses for the session when localStorage throws', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    setBootstrap({ role: 'ADMIN' })
    const { user } = renderShell()
    await user.click(floLink() as HTMLElement)
    expect(floLink()).toHaveTextContent(/^Flo AI$/)
  })

  it('is hidden from a manager and from a technician', () => {
    setBootstrap({ role: 'MANAGER' })
    const manager = renderShell()
    expect(floLink()).not.toBeInTheDocument()
    manager.unmount()

    setBootstrap({ role: 'TECHNICIAN', isTechnician: true })
    renderShell()
    expect(floLink()).not.toBeInTheDocument()
  })

  it('keeps the badge text for screen readers only in the collapsed rail', () => {
    renderWithProviders(
      <AppSidebarNav navItems={appShellContent.sidebar.nav} quickActionsTitle="Quick" quickActions={[]} collapsed />,
    )
    expect(screen.getByText('NEW')).toHaveClass('sr-only')
  })
})
