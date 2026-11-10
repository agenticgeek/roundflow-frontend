import { describe, expect, it, vi } from 'vitest'
import { HttpResponse, http } from 'msw'
import { screen } from '@testing-library/react'
import { ConversationDrawer } from '@/components/flo/ConversationDrawer'
import { server } from '@/test/msw/server'
import { API } from '@/test/msw/typed'
import { renderWithProviders } from '@/test/render'

function drawer(props: Partial<Parameters<typeof ConversationDrawer>[0]> = {}) {
  const handlers = { onClose: vi.fn(), onOpen: vi.fn(), onDeleted: vi.fn() }
  return { ...handlers, ...renderWithProviders(<ConversationDrawer open activeId={null} {...handlers} {...props} />) }
}

describe('ConversationDrawer', () => {
  it('shows loading, then an empty message', async () => {
    drawer()
    expect(screen.getByText('Loading conversations')).toBeInTheDocument()
    expect(await screen.findByText('No conversations yet.')).toBeInTheDocument()
  })

  it('shows an error when the list cannot load', async () => {
    server.use(http.get(`${API}/flo/conversations`, () => HttpResponse.json({ error: 'x' }, { status: 500 })))
    drawer()
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load your conversations.')
  })

  it('opens a conversation and closes, marking the active one', async () => {
    server.use(http.get(`${API}/flo/conversations`, () => HttpResponse.json({ conversations: [{ id: 'c1', title: 'First' }] })))
    const { user, onOpen, onClose } = drawer({ activeId: 'c1' })
    const open = await screen.findByRole('button', { name: 'Open First' })
    expect(open).toHaveAttribute('aria-current', 'true')
    await user.click(open)
    expect(onOpen).toHaveBeenCalledWith('c1')
    expect(onClose).toHaveBeenCalled()
  })

  it('keeps the confirmation open with the error when a delete fails, and can be cancelled', async () => {
    server.use(
      http.get(`${API}/flo/conversations`, () => HttpResponse.json({ conversations: [{ id: 'c1', title: 'First' }] })),
      http.delete(`${API}/flo/conversations/c1`, () => HttpResponse.json({ error: 'Could not delete' }, { status: 500 })),
    )
    const { user, onDeleted } = drawer()
    await user.click(await screen.findByRole('button', { name: 'Delete First' }))
    expect(screen.getByRole('alertdialog', { name: 'Delete this conversation?' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    expect(await screen.findByText('Could not delete')).toBeInTheDocument()
    expect(onDeleted).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })
})
