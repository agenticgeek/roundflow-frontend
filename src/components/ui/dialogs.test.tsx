import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { createPortal } from 'react-dom'
import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Modal, ModalButton, ModalFooter, ModalToggleRow } from '@/components/ui/modal'
import { SidePanel } from '@/components/ui/side-panel'

function ModalHarness({ onClose = vi.fn() }: { onClose?: () => void }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open modal
      </button>
      <p>page behind</p>
      <Modal
        open={open}
        onClose={() => {
          onClose()
          setOpen(false)
        }}
        title="Edit thing"
        showCloseButton
        footer={<button type="button">Save</button>}
      >
        <label>
          Name <input />
        </label>
      </Modal>
    </>
  )
}

describe('Modal accessibility (WEB-13)', () => {
  it('moves focus in, traps Tab both ways, closes on Escape and returns focus', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<ModalHarness onClose={onClose} />)
    const opener = screen.getByRole('button', { name: 'Open modal' })
    await user.click(opener)

    const dialog = screen.getByRole('dialog', { name: 'Edit thing' })
    const close = within(dialog).getByRole('button', { name: 'Close dialog' })
    expect(close).toBeInTheDocument()
    // First control in the dialog (the close button) takes focus; the backdrop is not a tab stop.
    expect(dialog).toContainElement(document.activeElement as HTMLElement)

    await user.tab()
    expect(screen.getByLabelText('Name')).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('button', { name: 'Save' })).toHaveFocus()
    await user.tab()
    expect(close).toHaveFocus()
    await user.tab({ shift: true })
    expect(screen.getByRole('button', { name: 'Save' })).toHaveFocus()

    // The page behind is inert while the dialog is open.
    expect(screen.getByText('page behind').closest('[inert]')).not.toBeNull()

    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(opener).toHaveFocus()
    expect(screen.getByText('page behind').closest('[inert]')).toBeNull()
  })

  it('wraps from the dialog itself and recovers focus that fell to the body', async () => {
    const user = userEvent.setup()
    render(
      <Modal open onClose={() => undefined} title="Plain">
        <p>Nothing to focus here</p>
      </Modal>,
    )
    const dialog = screen.getByRole('dialog', { name: 'Plain' })
    // No controls: the dialog takes focus, and Tab keeps it there.
    expect(dialog).toHaveFocus()
    await user.tab()
    expect(dialog).toHaveFocus()
    await user.tab({ shift: true })
    expect(dialog).toHaveFocus()

    ;(document.activeElement as HTMLElement).blur()
    await user.tab()
    expect(dialog).toHaveFocus()
  })

  it('pulls focus back to the last control on Shift+Tab from the body, and leaves portalled menus alone', async () => {
    const user = userEvent.setup()
    render(
      <>
        <div id="menu" tabIndex={0} data-testid="menu" />
        <Modal open onClose={() => undefined} title="Two" footer={<button type="button">Last</button>}>
          <input aria-label="First" />
        </Modal>
      </>,
    )
    ;(document.activeElement as HTMLElement).blur()
    await user.tab({ shift: true })
    expect(screen.getByRole('button', { name: 'Last' })).toHaveFocus()

    // Focus outside the dialog but not on the body (e.g. a dropdown menu portal): untouched.
    const outside = document.createElement('button')
    document.body.appendChild(outside)
    outside.focus()
    // fireEvent returns false when a handler called preventDefault.
    expect(fireEvent.keyDown(outside, { key: 'Tab' })).toBe(true)
    expect(outside).toHaveFocus()
    outside.remove()
  })

  it('does not steal focus from a child that took it with autoFocus', () => {
    render(
      <Modal open onClose={() => undefined} title="Auto">
        <input aria-label="Auto field" autoFocus />
        <button type="button">Other</button>
      </Modal>,
    )
    expect(screen.getByLabelText('Auto field')).toHaveFocus()
  })

  it('does not refocus an opener that is gone or a control the user already moved to', async () => {
    const user = userEvent.setup()
    function Harness() {
      const [open, setOpen] = useState(false)
      const [hidden, setHidden] = useState(false)
      return (
        <>
          {hidden ? null : (
            <button type="button" onClick={() => setOpen(true)}>
              Opener
            </button>
          )}
          <button type="button" onClick={() => setOpen(true)}>
            Second
          </button>
          <Modal
            open={open}
            onClose={() => setOpen(false)}
            title="Gone"
            footer={
              <button
                type="button"
                onClick={() => {
                  setHidden(true)
                  setOpen(false)
                }}
              >
                Remove opener
              </button>
            }
          >
            <p>x</p>
          </Modal>
        </>
      )
    }
    render(<Harness />)
    await user.click(screen.getByRole('button', { name: 'Opener' }))
    await user.click(screen.getByRole('button', { name: 'Remove opener' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Opener' })).not.toBeInTheDocument()
  })

  it('only the topmost of two stacked dialogs reacts to Escape', async () => {
    const user = userEvent.setup()
    function Stack() {
      const [inner, setInner] = useState(true)
      return (
        <>
          <Modal open onClose={() => undefined} title="Outer">
            <button type="button">Outer button</button>
          </Modal>
          <Modal open={inner} onClose={() => setInner(false)} title="Inner">
            <button type="button">Inner button</button>
          </Modal>
        </>
      )
    }
    render(<Stack />)
    const inner = screen.getByRole('dialog', { name: 'Inner' })
    // Mounted together: the top dialog is usable, the one beneath it is inert.
    expect(inner.closest('[inert]')).toBeNull()
    expect(screen.getByRole('dialog', { name: 'Outer' }).closest('[inert]')).not.toBeNull()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog', { name: 'Inner' })).not.toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: 'Outer' })).toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: 'Outer' }).closest('[inert]')).toBeNull()
  })

  it('keeps toast viewports interactive while a dialog is open', () => {
    render(
      <>
        {createPortal(
          <div data-toast-viewport>
            <button type="button">Retry</button>
          </div>,
          document.body,
        )}
        <Modal open onClose={() => undefined} title="With toast">
          <p>body</p>
        </Modal>
      </>,
    )
    expect(screen.getByRole('button', { name: 'Retry' }).closest('[inert]')).toBeNull()
  })

  it('names and describes an alert dialog', () => {
    render(
      <Modal open onClose={() => undefined} title="Sure?" role="alertdialog" descriptionId="why">
        <p id="why">Because.</p>
      </Modal>,
    )
    expect(screen.getByRole('alertdialog', { name: 'Sure?' })).toHaveAccessibleDescription('Because.')
  })
})

describe('SidePanel accessibility (WEB-13)', () => {
  it('traps focus, closes on Escape and returns focus to the opener', async () => {
    const user = userEvent.setup()
    function Harness() {
      const [open, setOpen] = useState(false)
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>
            Open panel
          </button>
          <SidePanel open={open} onClose={() => setOpen(false)} title="Details" footer={<button type="button">Act</button>}>
            <a href="#x">Link</a>
          </SidePanel>
        </>
      )
    }
    render(<Harness />)
    const opener = screen.getByRole('button', { name: 'Open panel' })
    await user.click(opener)
    const dialog = screen.getByRole('dialog', { name: 'Details' })
    expect(dialog).toContainElement(document.activeElement as HTMLElement)
    await user.tab()
    await user.tab()
    await user.tab()
    expect(dialog).toContainElement(document.activeElement as HTMLElement)
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(opener).toHaveFocus()
  })
})

describe('ConfirmDialog', () => {
  function Harness({ onConfirm = vi.fn(), error = null as string | null, pending = false }) {
    const [open, setOpen] = useState(false)
    return (
      <>
        <button type="button" onClick={() => setOpen(true)}>
          Delete thing
        </button>
        <ConfirmDialog
          open={open}
          title="Delete this thing?"
          description="It will be gone."
          confirmLabel="Delete it"
          error={error}
          pending={pending}
          onConfirm={() => {
            onConfirm()
            setOpen(false)
          }}
          onClose={() => setOpen(false)}
        />
      </>
    )
  }

  it('opens on Cancel, describes the consequence, and does nothing until confirmed', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    render(<Harness onConfirm={onConfirm} />)
    const trigger = screen.getByRole('button', { name: 'Delete thing' })
    await user.click(trigger)

    const dialog = screen.getByRole('alertdialog', { name: 'Delete this thing?' })
    expect(dialog).toHaveAccessibleDescription('It will be gone.')
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus()
    expect(onConfirm).not.toHaveBeenCalled()

    await user.keyboard('{Escape}')
    expect(onConfirm).not.toHaveBeenCalled()
    expect(trigger).toHaveFocus()

    await user.click(trigger)
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onConfirm).not.toHaveBeenCalled()

    await user.click(trigger)
    await user.click(screen.getByRole('button', { name: 'Delete it' }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(trigger).toHaveFocus()
  })

  it('shows a failure inline and locks while pending', async () => {
    const user = userEvent.setup()
    const first = render(<Harness error="Server said no" />)
    await user.click(screen.getByRole('button', { name: 'Delete thing' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Server said no')
    first.unmount()

    render(<Harness pending />)
    await user.click(screen.getByRole('button', { name: 'Delete thing' }))
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Delete it' })).toBeDisabled()
    await user.keyboard('{Escape}')
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
  })
})

describe('Modal building blocks', () => {
  it('renders footers, buttons and toggle rows in both sizes', () => {
    render(
      <>
        <ModalFooter>
          <ModalButton>Default size</ModalButton>
          <ModalButton variant="danger" compact loading>
            Compact
          </ModalButton>
        </ModalFooter>
        <ModalFooter compact>
          <ModalButton variant="primary">Primary</ModalButton>
        </ModalFooter>
        <ModalToggleRow label="Plain" description="Roomy" checked={false} onChange={() => undefined} ariaLabel="plain toggle" />
        <ModalToggleRow label="Tight" description="Explains it" compact checked onChange={() => undefined} ariaLabel="tight toggle" />
      </>,
    )
    expect(screen.getByRole('button', { name: 'Default size' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Compact' })).toBeDisabled()
    expect(screen.getByText('Explains it')).toBeInTheDocument()
    expect(screen.getByRole('switch', { name: 'plain toggle' })).toBeInTheDocument()
  })
})
