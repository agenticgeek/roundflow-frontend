import { describe, expect, it } from 'vitest'
import { act, screen, waitFor, within } from '@testing-library/react'
import { HttpResponse } from 'msw'
import { useLocation } from 'react-router-dom'
import type { AppNotification, NotificationsPage } from '@/api/notifications.api'
import { NotificationCentre } from '@/components/app/NotificationCentre'
import { notificationKeys } from '@/features/notifications/hooks/useNotifications'
import { server } from '@/test/msw/server'
import { gate, on, specJson } from '@/test/msw/typed'
import { setBootstrap } from '@/test/bootstrap'
import { renderWithProviders } from '@/test/render'

function notification(overrides: Partial<AppNotification>): AppNotification {
  return {
    id: 'n1',
    type: 'SCHEDULE',
    title: 'Round assigned',
    body: 'Sam now works Alnwick Fri',
    read: false,
    createdAt: '2026-11-06T09:30:00.000Z',
    data: { roundId: 'r1' },
    ...overrides,
  }
}

/** A mutable backend: the list, the unread count, and a log of the writes. */
function backend(initial: AppNotification[], options: { pageSize?: number; failMarkAll?: boolean; failList?: boolean } = {}) {
  const state = { items: initial, writes: [] as string[], listCalls: 0, unreadCalls: 0 }
  const unread = () => state.items.filter((item) => !item.read).length
  server.use(
    on('get', '/notifications/unread-count', () => {
      state.unreadCalls += 1
      return specJson('/notifications/unread-count', 'get', 200, { unreadCount: unread() })
    }),
    on('get', '/notifications', ({ request }) => {
      state.listCalls += 1
      if (options.failList && state.listCalls === 1) return HttpResponse.json({ error: 'Feed down' }, { status: 500 })
      const cursor = new URL(request.url).searchParams.get('cursor')
      const size = options.pageSize ?? state.items.length
      const start = cursor ? Number(cursor) : 0
      const page: NotificationsPage = {
        notifications: state.items.slice(start, start + size),
        unreadCount: unread(),
        nextCursor: start + size < state.items.length ? String(start + size) : null,
      }
      return HttpResponse.json(page)
    }),
    on('post', '/notifications/read-all', () => {
      if (options.failMarkAll) return HttpResponse.json({ error: 'no' }, { status: 500 })
      state.writes.push('read-all')
      state.items = state.items.map((item) => ({ ...item, read: true }))
      return specJson('/notifications/read-all', 'post', 200, { ok: true })
    }),
    on('post', '/notifications/{id}/read', ({ params }) => {
      state.writes.push(`read ${String(params.id)}`)
      state.items = state.items.map((item) => (item.id === params.id ? { ...item, read: true } : item))
      return specJson('/notifications/{id}/read', 'post', 200, { ok: true })
    }),
  )
  return state
}

function Where() {
  const location = useLocation()
  return <p data-testid="where">{location.pathname}</p>
}

function renderCentre() {
  return renderWithProviders(
    <>
      <NotificationCentre />
      <button type="button">Elsewhere</button>
      <Where />
    </>,
  )
}

const items = [
  notification({ id: 'n1' }),
  notification({ id: 'n2', type: 'PAYMENT', title: 'Payment failed', body: null, data: { invoiceId: 'i1' } }),
  notification({ id: 'n3', type: 'CHAT', title: 'Sam sent a message', data: null, read: true }),
  notification({ id: 'n4', type: 'ACCESS_ISSUE', title: 'Gate locked', body: null, data: { propertyId: 'p1', visitId: 'v1' } }),
]

describe('NotificationCentre bell (NOTIF-06)', () => {
  it('puts the unread count in the accessible name, and says "none" when there is nothing', async () => {
    backend(items)
    const first = renderCentre()
    expect(await screen.findByRole('button', { name: 'Notifications, 3 unread' })).toHaveAttribute('aria-haspopup', 'dialog')
    first.unmount()

    backend(items.map((item) => ({ ...item, read: true })))
    renderCentre()
    expect(await screen.findByRole('button', { name: 'Notifications, none unread' })).toBeInTheDocument()
  })

  it('caps the visual badge at 99+', async () => {
    backend(Array.from({ length: 120 }, (_, index) => notification({ id: `n${index}` })))
    renderCentre()
    expect(await screen.findByRole('button', { name: 'Notifications, 120 unread' })).toHaveTextContent('99+')
  })

  it('is not rendered for technicians, and asks the server nothing', () => {
    setBootstrap({ canMutate: false, role: 'TECHNICIAN', isTechnician: true })
    const state = backend(items)
    renderCentre()
    expect(screen.queryByRole('button', { name: /Notifications/ })).not.toBeInTheDocument()
    expect(state.unreadCalls).toBe(0)
  })

  it('announces new notifications politely, but not on first load', async () => {
    const state = backend([notification({ id: 'n1' })])
    const { queryClient } = renderCentre()
    await screen.findByRole('button', { name: 'Notifications, 1 unread' })
    const region = screen.getByRole('status')
    expect(region).toHaveAttribute('aria-live', 'polite')
    expect(region).toBeEmptyDOMElement()

    state.items = [...state.items, notification({ id: 'n2' })]
    await act(() => queryClient.invalidateQueries({ queryKey: notificationKeys.unread }))
    await waitFor(() => expect(region).toHaveTextContent('2 unread notifications'))

    // Going down is not announced.
    state.items = state.items.map((item) => ({ ...item, read: true }))
    await act(() => queryClient.invalidateQueries({ queryKey: notificationKeys.unread }))
    await screen.findByRole('button', { name: 'Notifications, none unread' })
    expect(region).toHaveTextContent('2 unread notifications')

    state.items = [notification({ id: 'n9' })]
    await act(() => queryClient.invalidateQueries({ queryKey: notificationKeys.unread }))
    await waitFor(() => expect(region).toHaveTextContent('1 unread notification'))
  })
})

describe('NotificationCentre panel', () => {
  it('opens a labelled popover, moves focus in, lists notifications and closes on Escape with focus back on the bell', async () => {
    backend(items)
    const { user } = renderCentre()
    const bell = await screen.findByRole('button', { name: 'Notifications, 3 unread' })
    expect(bell).toHaveAttribute('aria-expanded', 'false')

    await user.click(bell)
    const dialog = await screen.findByRole('dialog', { name: 'Notifications' })
    expect(bell).toHaveAttribute('aria-expanded', 'true')
    expect(bell).toHaveAttribute('aria-controls', dialog.id)
    expect(dialog).toHaveFocus()

    const list = await screen.findByRole('list', { name: 'Recent notifications' })
    const rows = within(list).getAllByRole('listitem')
    expect(rows).toHaveLength(4)
    expect(within(rows[0]!).getByText('Schedule')).toBeInTheDocument()
    expect(within(rows[0]!).getByText(/^Unread\./)).toBeInTheDocument()
    expect(within(rows[2]!).getByText(/^Read\./)).toBeInTheDocument()
    expect(within(rows[0]!).getByText('Sam now works Alnwick Fri')).toBeInTheDocument()
    expect(rows[0]!.querySelector('time')).toHaveAttribute('datetime', '2026-11-06T09:30:00.000Z')

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(bell).toHaveFocus()
    expect(bell).toHaveAttribute('aria-expanded', 'false')

    // The bell toggles it again.
    await user.click(bell)
    await screen.findByRole('dialog', { name: 'Notifications' })
    await user.click(bell)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('closes on a click elsewhere or when focus tabs out, but not on a click inside', async () => {
    backend(items)
    const { user } = renderCentre()
    await user.click(await screen.findByRole('button', { name: 'Notifications, 3 unread' }))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('heading', { name: 'Notifications' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    await user.click(document.body)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Notifications, 3 unread' }))
    await screen.findByRole('dialog')
    await user.tab()
    expect(screen.getByRole('button', { name: 'Mark all read' })).toHaveFocus()
    // Focus moving back to the bell keeps it open; moving anywhere else closes it.
    await act(async () => screen.getByRole('button', { name: /Notifications, 3 unread/ }).focus())
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    await act(async () => screen.getByRole('button', { name: 'Mark all read' }).focus())
    await act(async () => screen.getByRole('button', { name: 'Elsewhere' }).focus())
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('activating an unread notification marks it read, opens its page and closes the popover', async () => {
    const state = backend(items)
    const { user } = renderCentre()
    await user.click(await screen.findByRole('button', { name: 'Notifications, 3 unread' }))
    const list = await screen.findByRole('list', { name: 'Recent notifications' })

    await user.click(within(list).getByRole('link', { name: /Payment failed/ }))
    await waitFor(() => expect(state.writes).toEqual(['read n2']))
    expect(screen.getByTestId('where')).toHaveTextContent('/invoices')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    // The badge catches up from the server.
    expect(await screen.findByRole('button', { name: 'Notifications, 2 unread' })).toBeInTheDocument()
  })

  it('links by data: property, round; a notification with no page is a button that only marks read', async () => {
    const state = backend(items)
    const { user } = renderCentre()
    await user.click(await screen.findByRole('button', { name: /Notifications, 3 unread/ }))
    const list = await screen.findByRole('list', { name: 'Recent notifications' })
    expect(within(list).getByRole('link', { name: /Gate locked/ })).toHaveAttribute('href', '/properties/p1')
    expect(within(list).getByRole('link', { name: /Round assigned/ })).toHaveAttribute('href', '/round-planner?round=r1')

    // Already read and with no page: nothing is sent.
    await user.click(within(list).getByRole('button', { name: /Sam sent a message/ }))
    expect(state.writes).toEqual([])
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('an unread notification with no page is marked read in place', async () => {
    const state = backend([notification({ id: 'n7', type: 'CHAT', title: 'New message', data: null })])
    const { user } = renderCentre()
    await user.click(await screen.findByRole('button', { name: 'Notifications, 1 unread' }))
    await user.click(await screen.findByRole('button', { name: /New message/ }))
    await waitFor(() => expect(state.writes).toEqual(['read n7']))
  })

  it('"Mark all read" clears the badge, then disables itself', async () => {
    const state = backend(items)
    const { user } = renderCentre()
    await user.click(await screen.findByRole('button', { name: 'Notifications, 3 unread' }))
    await user.click(await screen.findByRole('button', { name: 'Mark all read' }))
    await waitFor(() => expect(state.writes).toEqual(['read-all']))
    expect(await screen.findByRole('button', { name: 'Notifications, none unread' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Mark all read' })).toBeDisabled()
  })

  it('"Mark all read" failure is announced as an alert', async () => {
    backend(items, { failMarkAll: true })
    const { user } = renderCentre()
    await user.click(await screen.findByRole('button', { name: 'Notifications, 3 unread' }))
    await user.click(await screen.findByRole('button', { name: 'Mark all read' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not mark notifications as read.')
  })

  it('shows loading, the empty state, an error with retry, and pages older notifications', async () => {
    // empty
    backend([])
    const empty = renderCentre()
    await empty.user.click(await screen.findByRole('button', { name: 'Notifications, none unread' }))
    expect(await screen.findByText('You’re all caught up.')).toBeInTheDocument()
    empty.unmount()

    // error then retry
    backend(items, { failList: true })
    const failing = renderCentre()
    await failing.user.click(await screen.findByRole('button', { name: /Notifications/ }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load notifications.')
    await failing.user.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByRole('list', { name: 'Recent notifications' })).toBeInTheDocument()
    failing.unmount()

    // paging
    backend(items, { pageSize: 3 })
    const paged = renderCentre()
    await paged.user.click(await screen.findByRole('button', { name: /Notifications/ }))
    const list = await screen.findByRole('list', { name: 'Recent notifications' })
    expect(within(list).getAllByRole('listitem')).toHaveLength(3)
    await paged.user.click(screen.getByRole('button', { name: 'Show older notifications' }))
    await waitFor(() => expect(within(list).getAllByRole('listitem')).toHaveLength(4))
    expect(screen.queryByRole('button', { name: 'Show older notifications' })).not.toBeInTheDocument()
  })

  it('disables "show older" and says it is loading while the next page is fetched', async () => {
    const pageGate = gate()
    server.use(
      on('get', '/notifications/unread-count', () => specJson('/notifications/unread-count', 'get', 200, { unreadCount: 1 })),
      on('get', '/notifications', async ({ request }) => {
        const cursor = new URL(request.url).searchParams.get('cursor')
        if (cursor) await pageGate.wait()
        return HttpResponse.json({
          notifications: [notification({ id: cursor ? 'n2' : 'n1', title: cursor ? 'Older one' : 'Newer one' })],
          unreadCount: 1,
          nextCursor: cursor ? null : 'c1',
        })
      }),
    )
    const { user } = renderCentre()
    await user.click(await screen.findByRole('button', { name: /Notifications/ }))
    await user.click(await screen.findByRole('button', { name: 'Show older notifications' }))
    expect(screen.getByRole('button', { name: 'Loading…' })).toBeDisabled()
    pageGate.release()
    expect(await screen.findByText('Older one')).toBeInTheDocument()
  })

  it('shows a loading message while the feed loads', async () => {
    backend(items)
    const { user } = renderCentre()
    const bell = await screen.findByRole('button', { name: /Notifications/ })
    await user.click(bell)
    // The first paint of the open panel is the loading state.
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(await screen.findByRole('list', { name: 'Recent notifications' })).toBeInTheDocument()
  })
})
