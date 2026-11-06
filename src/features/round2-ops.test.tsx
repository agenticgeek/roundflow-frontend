import { describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { HttpResponse } from 'msw'
import { QueryClient } from '@tanstack/react-query'
import { chatApi, type ChatMessage } from '@/api/chat.api'
import { ChatThreadView } from '@/components/chat/ChatThreadView'
import { DebtBulkBar } from '@/components/debt-payment/DebtBulkBar'
import { CustomerInbox } from '@/components/property-detail/CustomerInbox'
import { AppSidebarNav } from '@/components/app/AppSidebar'
import { TodaysWorkRoundDetailPanel } from '@/components/todays-work/TodaysWorkRoundDetailPanel'
import { customerListRowToRecord } from '@/features/customers/lib/mappers'
import { lastMessageTime, mergeMessages } from '@/features/chat/hooks/useChat'
import { server } from '@/test/msw/server'
import { apiError, on } from '@/test/msw/typed'
import { renderWithProviders } from '@/test/render'

function message(overrides: Partial<ChatMessage>): ChatMessage {
  return {
    id: 'm1', roundId: 'r1', senderProfileId: 'u', senderRole: 'TECHNICIAN', body: 'Hi', type: 'TEXT', visitId: null,
    photoUrls: [], photoSignedUrls: [], clientMsgId: null, createdAt: '2026-11-03T10:00:00Z', isMine: false, ...overrides,
  }
}

describe('DebtBulkBar', () => {
  const selected = [
    { invoiceId: 'i1', label: 'Jo Coates' },
    { invoiceId: 'i2', label: 'Sam Reed' },
  ]

  it('renders nothing with no selection', () => {
    const { container } = renderWithProviders(<DebtBulkBar selected={[]} onClear={vi.fn()} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('confirms before sending reminders and lists per-id results', async () => {
    let body: unknown
    server.use(
      on('post', '/debt/bulk' as never, async ({ request }: { request: Request }) => {
        body = await request.json()
        return HttpResponse.json({
          action: 'remind', total: 2, succeeded: 1, failed: 1,
          results: [{ id: 'i1', ok: true }, { id: 'i2', ok: false, error: 'No contact for channel', code: 'NO_CONTACT_FOR_CHANNEL' }],
        })
      }),
    )
    const onClear = vi.fn()
    const { user } = renderWithProviders(<DebtBulkBar selected={selected} onClear={onClear} />)
    expect(screen.getByText('2 selected')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Send reminders' }))
    expect(body).toBeUndefined()
    expect(screen.getByText(/Send a payment reminder to 2 customers/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Confirm' }))
    expect(await screen.findByText('1 succeeded, 1 failed.')).toBeInTheDocument()
    expect(screen.getByText('Sam Reed')).toBeInTheDocument()
    expect(screen.getByText('No contact for channel')).toBeInTheDocument()
    expect(body).toEqual({ ids: ['i1', 'i2'], action: 'remind', channel: 'AUTO' })
    expect(onClear).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Close' }))
  })

  it('shows a skipped customer as skipped (not an error), in words', async () => {
    server.use(
      on('post', '/debt/bulk' as never, () =>
        HttpResponse.json({
          action: 'remind', total: 3, succeeded: 0, failed: 0,
          results: [
            { id: 'i1', ok: false, skipped: true, reason: 'CUSTOMER_OPTED_OUT' },
            { id: 'i2', ok: false, skipped: true, reason: 'NO_AVAILABLE_CHANNEL' },
            { id: 'i3', ok: false, skipped: true, reason: 'SOMETHING_NEW' },
          ],
        }) as never,
      ),
    )
    const { user } = renderWithProviders(<DebtBulkBar selected={selected} onClear={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: 'Send reminders' }))
    await user.click(screen.getByRole('button', { name: 'Confirm' }))
    expect(await screen.findByText('Skipped: opted out of messages')).toBeInTheDocument()
    expect(screen.getByText('Skipped: no way to reach them')).toBeInTheDocument()
    expect(screen.getByText('Skipped')).toBeInTheDocument()
  })

  it('puts on hold with a reason, then clears the selection when all succeed', async () => {
    let body: unknown
    server.use(
      on('post', '/debt/bulk' as never, async ({ request }: { request: Request }) => {
        body = await request.json()
        return HttpResponse.json({ action: 'hold', total: 2, succeeded: 2, failed: 0, results: [{ id: 'i1', ok: true }, { id: 'i2', ok: true }] })
      }),
    )
    const onClear = vi.fn()
    const { user } = renderWithProviders(<DebtBulkBar selected={selected} onClear={onClear} />)
    await user.click(screen.getByRole('button', { name: 'Put on hold' }))
    await user.type(screen.getByRole('textbox'), 'Chasing')
    await user.click(screen.getByRole('checkbox'))
    await user.click(screen.getByRole('button', { name: 'Confirm' }))
    await waitFor(() => expect(onClear).toHaveBeenCalled())
    expect(body).toEqual({ ids: ['i1', 'i2'], action: 'hold', reason: 'Chasing', notify: true })
  })

  it('flags bad debt and shows a request failure inside the confirm step', async () => {
    server.use(on('post', '/debt/bulk' as never, () => apiError(400, 'ids must have 1-100 entries') as never))
    const { user } = renderWithProviders(<DebtBulkBar selected={selected} onClear={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: 'Flag bad debt' }))
    expect(screen.getByText(/Flag 2 customers as bad debt/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Confirm' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('ids must have 1-100 entries')
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    await user.click(screen.getByRole('button', { name: 'Clear selection' }))
  })
})

describe('single-visit assign (Today’s Work)', () => {
  const round = {
    id: 'r1', round: 'Alnwick Fri', technician: 'Sam', technicianInitial: 'S', status: 'in-progress', progressCompleted: 0, progressTotal: 1,
    completed: 0, skipped: 0, issues: 0, eta: '', jobs: [{ id: 'v1', customer: 'Jo Coates', address: '4 Hotspur St', status: 'scheduled' }],
  } as never

  it('assigns, then unassigns a scheduled visit', async () => {
    const bodies: unknown[] = []
    server.use(
      on('get', '/settings/technicians', () => HttpResponse.json([{ id: 't1', name: 'Sam Reed', active: true, role: 'TECHNICIAN', appStatus: 'ACTIVE' }] as never)),
      on('patch', '/visits/{id}/assign' as never, async ({ request }: { request: Request }) => {
        const input = (await request.json()) as { technicianId: string | null }
        bodies.push(input)
        return HttpResponse.json({ id: 'v1', status: 'SCHEDULED', technicianId: input.technicianId, technicianName: input.technicianId ? 'Sam Reed' : null, technicianOverride: true })
      }),
    )
    const { user } = renderWithProviders(<TodaysWorkRoundDetailPanel round={round} onClose={vi.fn()} onReassignTechnician={vi.fn()} />)
    await user.click(await screen.findByRole('button', { name: 'Assign this visit' }))
    await user.click(await screen.findByRole('option', { name: 'Sam Reed' }))
    expect(await screen.findByText('Assigned to Sam Reed')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Assign this visit' }))
    await user.click(screen.getByRole('option', { name: 'Unassigned' }))
    expect(await screen.findByText('Visit unassigned')).toBeInTheDocument()
    expect(bodies).toEqual([{ technicianId: 't1' }, { technicianId: null }])
  })

  it('CHAT-01: links to a conversation with the technician, opened on this round', async () => {
    server.use(on('get', '/settings/technicians', () => HttpResponse.json([] as never)))
    const first = renderWithProviders(<TodaysWorkRoundDetailPanel round={{ ...(round as object), technicianId: 't1' } as never} onClose={vi.fn()} />)
    expect(await screen.findByRole('link', { name: 'Message technician' })).toHaveAttribute('href', '/technicians/t1/conversation?round=r1')
    first.unmount()
    renderWithProviders(<TodaysWorkRoundDetailPanel round={round} onClose={vi.fn()} />)
    expect(await screen.findByText('Alnwick Fri')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Message technician' })).not.toBeInTheDocument()
  })

  it('shows the server error inline', async () => {
    server.use(
      on('get', '/settings/technicians', () => HttpResponse.json([{ id: 't1', name: 'Sam Reed', active: true, role: 'TECHNICIAN', appStatus: 'ACTIVE' }] as never)),
      on('patch', '/visits/{id}/assign' as never, () => apiError(409, 'Visit is not scheduled') as never),
    )
    const { user } = renderWithProviders(<TodaysWorkRoundDetailPanel round={round} onClose={vi.fn()} onReassignTechnician={vi.fn()} />)
    await user.click(await screen.findByRole('button', { name: 'Assign this visit' }))
    await user.click(await screen.findByRole('option', { name: 'Sam Reed' }))
    expect(await screen.findByText('Visit is not scheduled')).toBeInTheDocument()
  })
})

describe('chat helpers', () => {
  it('merges by id and by clientMsgId, sorted oldest first, ignoring optimistic rows for the cursor', () => {
    const optimistic = message({ id: 'tmp-c1', clientMsgId: 'c1', isMine: true, createdAt: '2026-11-03T10:05:00Z' })
    const server1 = message({ id: 'm9', clientMsgId: 'c1', isMine: true, createdAt: '2026-11-03T10:05:01Z' })
    const merged = mergeMessages([message({ id: 'm2', createdAt: '2026-11-03T10:01:00Z' }), optimistic], [server1, message({ id: 'm1' })])
    expect(merged.map((item) => item.id)).toEqual(['m1', 'm2', 'm9'])
    expect(lastMessageTime([optimistic, message({ id: 'm2', createdAt: '2026-11-03T10:01:00Z' })])).toBe('2026-11-03T10:01:00Z')
    expect(lastMessageTime([])).toBeUndefined()
  })

  it('builds the chat urls', async () => {
    const seen: string[] = []
    server.use(
      on('get', '/chat/rounds/{roundId}/messages' as never, ({ request }: { request: Request }) => {
        seen.push(new URL(request.url).search)
        return HttpResponse.json({ messages: [], hasMore: false })
      }),
      on('get', '/messages/inbox' as never, ({ request }: { request: Request }) => {
        seen.push(new URL(request.url).search)
        return HttpResponse.json({ rows: [], unreadCount: 0, pagination: { page: 1, pageSize: 50, total: 0, totalPages: 1 } })
      }),
    )
    await chatApi.messages('r1', { since: '2026-11-03T10:00:00Z', limit: 50 })
    await chatApi.messages('r1', { before: 'x' })
    await chatApi.messages('r1')
    await chatApi.inbox({ customerId: 'c1', unreadOnly: true, page: 2 })
    await chatApi.inbox()
    expect(seen).toEqual(['?since=2026-11-03T10%3A00%3A00Z&limit=50', '?before=x', '', '?customerId=c1&unreadOnly=true&page=2', ''])
  })
})

describe('ChatThreadView', () => {
  it('shows messages, marks the thread read, sends optimistically with a clientMsgId and polls with since', async () => {
    const polls: string[] = []
    let sent: { text: string; clientMsgId: string } | undefined
    let reads = 0
    server.use(
      on('get', '/chat/rounds/{roundId}/messages' as never, ({ request }: { request: Request }) => {
        polls.push(new URL(request.url).search)
        return HttpResponse.json({ messages: [message({ id: 'm1', body: 'On my way', senderName: 'Sam' })], hasMore: false })
      }),
      on('post', '/chat/rounds/{roundId}/read' as never, () => {
        reads += 1
        return HttpResponse.json({ roundId: 'r1', lastReadAt: '2026-11-03T10:10:00Z' })
      }),
      on('get', '/chat/threads' as never, () => HttpResponse.json({ threads: [] })),
      on('get', '/chat/unread-count' as never, () => HttpResponse.json({ total: 0, rounds: [] })),
      on('post', '/chat/rounds/{roundId}/messages' as never, async ({ request }: { request: Request }) => {
        sent = (await request.json()) as { text: string; clientMsgId: string }
        return HttpResponse.json(message({ id: 'm2', body: sent.text, clientMsgId: sent.clientMsgId, isMine: true, senderRole: 'OFFICE', createdAt: '2026-11-03T10:11:00Z' }))
      }),
    )
    const { user, queryClient } = renderWithProviders(<ChatThreadView roundId="r1" roundName="Alnwick Fri" />)
    expect(await screen.findByText('On my way')).toBeInTheDocument()
    await waitFor(() => expect(reads).toBeGreaterThan(0))
    expect(polls[0]).toBe('')

    await user.type(screen.getByLabelText('Message'), 'Thanks Sam')
    await user.click(screen.getByRole('button', { name: 'Send' }))
    expect(await screen.findByText('Thanks Sam')).toBeInTheDocument()
    await waitFor(() => expect(sent?.text).toBe('Thanks Sam'))
    expect(sent?.clientMsgId).toBeTruthy()
    expect(screen.getAllByText('Thanks Sam')).toHaveLength(1)

    // The next poll asks only for what is newer than the newest message held.
    await (queryClient as QueryClient).refetchQueries({ queryKey: ['chat', 'messages', 'r1'] })
    expect(polls.at(-1)).toBe('?since=2026-11-03T10%3A11%3A00Z')
  })

  it('restores the text and shows the error when sending fails', async () => {
    server.use(
      on('get', '/chat/rounds/{roundId}/messages' as never, () => HttpResponse.json({ messages: [], hasMore: false })),
      on('post', '/chat/rounds/{roundId}/read' as never, () => HttpResponse.json({ roundId: 'r1', lastReadAt: 'x' })),
      on('post', '/chat/rounds/{roundId}/messages' as never, () => apiError(400, 'Message too long') as never),
    )
    const { user } = renderWithProviders(<ChatThreadView roundId="r1" roundName="Alnwick Fri" />)
    expect(await screen.findByText(/No messages yet/)).toBeInTheDocument()
    await user.type(screen.getByLabelText('Message'), 'Hello')
    await user.click(screen.getByRole('button', { name: 'Send' }))
    expect(await screen.findByText('Message too long')).toBeInTheDocument()
    expect(screen.getByLabelText('Message')).toHaveValue('Hello')
  })

  it('refuses a message over 2000 characters', async () => {
    server.use(
      on('get', '/chat/rounds/{roundId}/messages' as never, () => HttpResponse.json({ messages: [], hasMore: false })),
      on('post', '/chat/rounds/{roundId}/read' as never, () => HttpResponse.json({ roundId: 'r1', lastReadAt: 'x' })),
    )
    const { user } = renderWithProviders(<ChatThreadView roundId="r1" roundName="Alnwick Fri" />)
    await screen.findByText(/No messages yet/)
    await user.click(screen.getByLabelText('Message'))
    await user.paste('x'.repeat(2001))
    await user.click(screen.getByRole('button', { name: 'Send' }))
    expect(await screen.findByText('Messages can be up to 2,000 characters.')).toBeInTheDocument()
  })

  it('shows a load error', async () => {
    server.use(on('get', '/chat/rounds/{roundId}/messages' as never, () => apiError(500, 'Chat down') as never))
    renderWithProviders(<ChatThreadView roundId="r1" roundName="Alnwick Fri" />)
    expect(await screen.findByText('Chat down')).toBeInTheDocument()
  })
})

describe('sidebar unread badge', () => {
  it('shows the unread chat total next to Technicians', async () => {
    server.use(on('get', '/chat/unread-count' as never, () => HttpResponse.json({ total: 7, rounds: [] })))
    renderWithProviders(
      <AppSidebarNav
        navItems={[{ id: 'technicians', label: 'Technicians', icon: 'technicians', route: '/technicians' as never }]}
        quickActionsTitle="Quick"
        quickActions={[]}
        onQuickAction={vi.fn()}
      />,
    )
    expect(await screen.findByLabelText('7 unread chat messages')).toHaveTextContent('7')
  })
})

describe('CustomerInbox', () => {
  it('lists replies and marks them all read', async () => {
    let unread = 1
    server.use(
      on('get', '/messages/inbox' as never, () =>
        HttpResponse.json({
          rows: [{ id: 'x1', customerId: 'c1', customerName: 'Jo', channel: 'SMS', body: 'Can you come Friday?', receivedAt: '2026-11-03T09:00:00Z', unread: unread > 0 }],
          unreadCount: unread,
          pagination: { page: 1, pageSize: 50, total: 1, totalPages: 1 },
        }),
      ),
      on('post', '/messages/inbox/read' as never, () => {
        unread = 0
        return HttpResponse.json({ updated: 1 })
      }),
    )
    const { user } = renderWithProviders(<CustomerInbox customerId="c1" />)
    expect(await screen.findByText('Can you come Friday?')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Mark all as read' }))
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Mark all as read' })).not.toBeInTheDocument())
  })

  it('shows empty and error states', async () => {
    server.use(
      on('get', '/messages/inbox' as never, () =>
        HttpResponse.json({ rows: [], unreadCount: 0, pagination: { page: 1, pageSize: 50, total: 0, totalPages: 1 } }),
      ),
    )
    const first = renderWithProviders(<CustomerInbox customerId="c1" />)
    expect(await screen.findByText('No replies from this customer.')).toBeInTheDocument()
    first.unmount()
    server.use(on('get', '/messages/inbox' as never, () => apiError(500, 'Inbox down') as never))
    renderWithProviders(<CustomerInbox customerId="c2" />)
    expect(await screen.findByText('Inbox down')).toBeInTheDocument()
  })
})

describe('customers without a property', () => {
  it('maps a hasNoProperty row so nothing tries to open a property', () => {
    const record = customerListRowToRecord({ customerId: 'c1', customerName: 'Jo', propertyId: null, addressLine: null, postcode: null, hasNoProperty: true } as never)
    expect(record).toMatchObject({ id: 'c1', propertyId: '', hasNoProperty: true, needsAssignment: false })
    expect(customerListRowToRecord({ customerId: 'c2', propertyId: 'p2', addressLine: 'x' } as never)).toMatchObject({ hasNoProperty: false, needsAssignment: true })
  })
})
