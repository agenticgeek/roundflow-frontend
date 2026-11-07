import { describe, expect, it } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import { HttpResponse } from 'msw'
import type { ChatMessage } from '@/api/chat.api'
import { TechnicianChat } from '@/components/chat/TechnicianChat'
import { server } from '@/test/msw/server'
import { apiError, gate, on } from '@/test/msw/typed'
import { renderWithProviders } from '@/test/render'

function message(overrides: Partial<ChatMessage>): ChatMessage {
  return {
    id: 'm1', roundId: 'r1', senderProfileId: 'u', senderRole: 'TECHNICIAN', body: 'Hi', type: 'TEXT', visitId: null,
    photoUrls: [], photoSignedUrls: [], clientMsgId: null, createdAt: '2026-11-03T10:00:00Z', isMine: false, ...overrides,
  }
}

const thread = (roundId: string, name: string, techId: string, unread: number) => ({
  roundId, roundName: name, technicians: [{ id: techId, name: 'Sam', active: true }], lastMessage: null, unreadCount: unread,
})

const roundItem = (id: string, name: string, technicianCount = 1) => ({
  id, name, frequency: 'FOUR_WEEKLY', defaultDay: 'MON', status: 'ACTIVE', serviceAreaId: 'a1', serviceAreaName: 'Alnwick',
  technicianCount, propertyCount: 3,
})

const roundDetail = (id: string, name: string, technicianIds: string[]) => ({
  ...roundItem(id, name), description: null, technicians: technicianIds.map((techId) => ({ id: techId, name: 'Sam', active: true })),
})

/** Rounds r1 (Alnwick Fri) and r2 (Amble Mon) are Sam's (t1); r3 is someone else's; r4 has no technician. */
function useRounds() {
  server.use(
    on('get', '/rounds' as never, () =>
      HttpResponse.json([roundItem('r1', 'Alnwick Fri'), roundItem('r2', 'Amble Mon'), roundItem('r3', 'Other'), roundItem('r4', 'Unstaffed', 0)]),
    ),
    on('get', '/rounds/{id}' as never, ({ params }) => {
      const id = String(params.id)
      const names: Record<string, [string, string[]]> = {
        r1: ['Alnwick Fri', ['t1']], r2: ['Amble Mon', ['t1', 't2']], r3: ['Other', ['t9']],
      }
      const [name, techs] = names[id] ?? ['?', []]
      return HttpResponse.json(roundDetail(id, name, techs))
    }),
  )
}

function useMessages() {
  server.use(
    on('get', '/chat/rounds/{roundId}/messages' as never, ({ params }) =>
      HttpResponse.json({ messages: [message({ id: `m-${String(params.roundId)}`, body: `hello ${String(params.roundId)}` })], hasMore: false }),
    ),
    on('post', '/chat/rounds/{roundId}/read' as never, () => HttpResponse.json({ roundId: 'x', lastReadAt: 'x' })),
  )
}

describe('TechnicianChat', () => {
  it('shows only this technician’s rounds, with unread counts, and switches thread', async () => {
    useRounds()
    useMessages()
    server.use(
      on('get', '/chat/threads' as never, () =>
        HttpResponse.json({ threads: [thread('r1', 'Alnwick Fri', 't1', 2), thread('r2', 'Amble Mon', 't1', 0), thread('r3', 'Other', 't9', 5)] }),
      ),
    )
    const { user } = renderWithProviders(<TechnicianChat technicianId="t1" />)
    expect(await screen.findByRole('tab', { name: /Alnwick Fri/ })).toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: /Other/ })).not.toBeInTheDocument()
    expect(screen.getByLabelText('2 unread')).toBeInTheDocument()
    expect(await screen.findByText('hello r1')).toBeInTheDocument()
    await user.click(screen.getByRole('tab', { name: /Amble Mon/ }))
    expect(await screen.findByText('hello r2')).toBeInTheDocument()
    // Both of Sam's rounds already have a chat: nothing left to start.
    expect(screen.queryByRole('button', { name: 'Start conversation' })).not.toBeInTheDocument()
  })

  it('CHAT-01: starts a conversation on a round with no messages yet, and the first send creates the thread', async () => {
    useRounds()
    let threads: ReturnType<typeof thread>[] = []
    const sent: unknown[] = []
    server.use(
      on('get', '/chat/threads' as never, () => HttpResponse.json({ threads })),
      on('get', '/chat/rounds/{roundId}/messages' as never, () => HttpResponse.json({ messages: [], hasMore: false })),
      on('post', '/chat/rounds/{roundId}/read' as never, () => HttpResponse.json({ roundId: 'x', lastReadAt: 'x' })),
      on('post', '/chat/rounds/{roundId}/messages' as never, async ({ request, params }) => {
        const body = (await request.json()) as { text: string; clientMsgId: string }
        sent.push({ roundId: params.roundId, text: body.text })
        threads = [thread(String(params.roundId), 'Amble Mon', 't1', 0)]
        return HttpResponse.json(message({ id: 'new1', roundId: String(params.roundId), body: body.text, isMine: true, senderRole: 'OFFICE', clientMsgId: body.clientMsgId }))
      }),
    )
    const { user } = renderWithProviders(<TechnicianChat technicianId="t1" />)

    expect(await screen.findByRole('heading', { name: 'Start a conversation' })).toBeInTheDocument()
    const start = screen.getByRole('button', { name: 'Start conversation' })
    expect(start).toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'Round' }))
    expect(screen.queryByRole('option', { name: 'Other' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('option', { name: 'Amble Mon' }))
    await user.click(start)

    // The thread view opens even though /chat/threads has no thread yet.
    expect(await screen.findByText('No messages yet. Write the first one below.')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Amble Mon/ })).toHaveAttribute('aria-selected', 'true')
    await user.type(screen.getByLabelText('Message'), 'Morning Sam')
    await user.click(screen.getByRole('button', { name: 'Send' }))
    await waitFor(() => expect(sent).toEqual([{ roundId: 'r2', text: 'Morning Sam' }]))
    // …and the threads list is refetched so the real thread takes the tab's place.
    await waitFor(() => expect(screen.getAllByRole('tab')).toHaveLength(1))
    expect(await screen.findByText('Morning Sam')).toBeInTheDocument()
  })

  it('offers the rounds without a chat next to the ones that have one', async () => {
    useRounds()
    useMessages()
    server.use(on('get', '/chat/threads' as never, () => HttpResponse.json({ threads: [thread('r1', 'Alnwick Fri', 't1', 0)] })))
    const { user } = renderWithProviders(<TechnicianChat technicianId="t1" />)
    expect(await screen.findByRole('tab', { name: /Alnwick Fri/ })).toBeInTheDocument()
    const another = await screen.findByRole('region', { name: 'Message another round' })
    await user.click(within(another).getByRole('button', { name: 'Message another round' }))
    await user.click(screen.getByRole('option', { name: 'Amble Mon' }))
    await user.click(within(another).getByRole('button', { name: 'Start conversation' }))
    expect(await screen.findByRole('tab', { name: /Amble Mon/ })).toHaveAttribute('aria-selected', 'true')
    expect(screen.queryByRole('region', { name: 'Message another round' })).not.toBeInTheDocument()
  })

  it('opens the round named by initialRoundId (the Message shortcut)', async () => {
    useRounds()
    server.use(
      on('get', '/chat/threads' as never, () => HttpResponse.json({ threads: [] })),
      on('get', '/chat/rounds/{roundId}/messages' as never, () => HttpResponse.json({ messages: [], hasMore: false })),
      on('post', '/chat/rounds/{roundId}/read' as never, () => HttpResponse.json({ roundId: 'x', lastReadAt: 'x' })),
    )
    renderWithProviders(<TechnicianChat technicianId="t1" initialRoundId="r2" />)
    expect(await screen.findByRole('tab', { name: /Amble Mon/ })).toHaveAttribute('aria-selected', 'true')
    expect(await screen.findByText('No messages yet. Write the first one below.')).toBeInTheDocument()
  })

  it('explains when the technician is on no round, with a way to assign them', async () => {
    useRounds()
    server.use(on('get', '/chat/threads' as never, () => HttpResponse.json({ threads: [] })))
    renderWithProviders(<TechnicianChat technicianId="nobody" />)
    expect(await screen.findByText(/isn’t on a round yet/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Assign technicians to rounds' })).toHaveAttribute('href', '/round-planner/assign-technicians')
  })

  it('says it is loading the rounds, then shows a rounds error', async () => {
    const roundsGate = gate()
    server.use(
      on('get', '/chat/threads' as never, () => HttpResponse.json({ threads: [] })),
      on('get', '/rounds' as never, async () => {
        await roundsGate.wait()
        return apiError(500, 'Rounds down') as never
      }),
    )
    renderWithProviders(<TechnicianChat technicianId="t1" />)
    expect(await screen.findByText('Loading rounds…')).toBeInTheDocument()
    roundsGate.release()
    expect(await screen.findByText('Rounds down')).toBeInTheDocument()
  })

  it('shows a threads error', async () => {
    useRounds()
    server.use(on('get', '/chat/threads' as never, () => apiError(500, 'Threads down') as never))
    renderWithProviders(<TechnicianChat technicianId="t1" />)
    expect(await screen.findByText('Threads down')).toBeInTheDocument()
  })
})
