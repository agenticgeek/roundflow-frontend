import { describe, expect, it, vi } from 'vitest'
import { useState } from 'react'
import { screen } from '@testing-library/react'
import { AppMobileNav } from '@/components/app/AppSidebar'
import { appShellContent } from '@/content/app-shell'
import { renderWithProviders } from '@/test/render'

function Harness({ onClose = vi.fn() }: { onClose?: () => void }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open menu
      </button>
      <AppMobileNav
        open={open}
        onClose={() => {
          onClose()
          setOpen(false)
        }}
        navItems={appShellContent.sidebar.nav}
        quickActionsTitle="Quick actions"
        quickActions={[]}
      />
    </>
  )
}

describe('AppMobileNav as a dialog (WEB-13)', () => {
  it('is a labelled modal dialog that traps focus, closes with Escape and returns focus', async () => {
    const onClose = vi.fn()
    const { user } = renderWithProviders(<Harness onClose={onClose} />)
    const opener = screen.getByRole('button', { name: 'Open menu' })
    await user.click(opener)

    const dialog = screen.getByRole('dialog', { name: 'Main menu' })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toContainElement(document.activeElement as HTMLElement)
    // The page behind is inert while the drawer is open.
    expect(opener.closest('[inert]')).not.toBeNull()

    // Tab stays inside the drawer.
    for (let index = 0; index < 40; index += 1) await user.tab()
    expect(dialog).toContainElement(document.activeElement as HTMLElement)

    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(opener).toHaveFocus()
  })

  it('closes from the close button', async () => {
    const onClose = vi.fn()
    const { user } = renderWithProviders(<Harness onClose={onClose} />)
    await user.click(screen.getByRole('button', { name: 'Open menu' }))
    await user.click(screen.getAllByRole('button', { name: appShellContent.sidebar.closeMenu })[1])
    expect(onClose).toHaveBeenCalled()
  })
})
