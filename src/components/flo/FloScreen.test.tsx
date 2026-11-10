import { beforeEach, describe, expect, it } from 'vitest'
import { HttpResponse, http } from 'msw'
import { act, screen, waitFor, within } from '@testing-library/react'
import { FloScreen } from '@/components/flo/FloScreen'
import { declinedStream, exampleFinalMessage, exampleStream, toSse, type RecordedEvent } from '@/test/flo-fixtures'
import { floStatus, sseResponse } from '@/test/msw/handlers/flo'
import { server } from '@/test/msw/server'
import { API } from '@/test/msw/typed'
import { renderWithProviders } from '@/test/render'

beforeEach(() => {
  localStorage.clear()
  // jsdom has no matchMedia; the typewriter asks for prefers-reduced-motion. Reduced: sentences appear whole.
  window.matchMedia = ((query: string) => ({ matches: true, media: query })) as unknown as typeof window.matchMedia
})

const liveRegion = () => screen.getByRole('status')
const conversation = () => within(screen.getByRole('region', { name: 'Conversation' }))

function controlledStream() {
  let controller!: ReadableStreamDefaultController<Uint8Array>
  const stream = new ReadableStream<Uint8Array>({ start: (c) => void (controller = c) })
  const encoder = new TextEncoder()
  server.use(http.post(`${API}/flo/chat`, () => new HttpResponse(stream, { headers: { 'Content-Type': 'text/event-stream' } })))
  return {
    push: (events: readonly RecordedEvent[]) => controller.enqueue(encoder.encode(toSse(events))),
    close: () => controller.close(),
  }
}

describe('FloScreen', () => {
  it('shows suggestions, answers a tapped one, and puts focus back in the question box', async () => {
    const { user } = renderWithProviders(<FloScreen />)
    expect(screen.getByRole('heading', { name: 'Flo AI' })).toBeInTheDocument()
    expect(await screen.findByText('42 questions left today')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /Balanced/ })).toBeChecked()

    await user.click(await screen.findByRole('button', { name: 'Compare my technicians for October' }))

    expect(await screen.findByRole('table', { name: 'Performance by technician' })).toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('textbox', { name: 'Ask Flo' })).toHaveFocus())
    // The persisted message replaced the streamed state: Sources and follow-ups only exist on it.
    expect(screen.getByText('Checked 2 data sources')).toBeInTheDocument()
    expect(liveRegion()).toHaveTextContent(exampleFinalMessage.answer!.intro)
    // Suggestions are gone once the conversation starts.
    expect(screen.queryByRole('heading', { name: 'What would you like to know?' })).not.toBeInTheDocument()
  })

  it('announces status changes, never the typed sentences, then the finished answer once', async () => {
    const live = controlledStream()
    const { user } = renderWithProviders(<FloScreen />)
    await user.type(await screen.findByRole('textbox', { name: 'Ask Flo' }), 'Compare{Enter}')

    expect(screen.getByRole('textbox', { name: 'Ask Flo' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Stop' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /Quick/ })).toBeDisabled()

    await act(async () => live.push(exampleStream.slice(0, 2)))
    await waitFor(() => expect(liveRegion()).toHaveTextContent('Checking: Technicians'))

    await act(async () => live.push(exampleStream.slice(7, 9)))
    expect(await screen.findByText('Here is October so far across your 3 active technicians.')).toBeInTheDocument()
    expect(liveRegion()).toHaveTextContent('Checking: Technicians')
    expect(liveRegion()).not.toHaveTextContent('October')
    expect(within(screen.getByRole('region', { name: 'Conversation' })).getByText('Liam Walsh had the most skips (14).')).toBeInTheDocument()

    await act(async () => {
      live.push(exampleStream.slice(9))
      live.close()
    })
    await waitFor(() => expect(liveRegion()).toHaveTextContent('Here is October so far'))
  })

  it('cancels a running answer from the Stop button', async () => {
    const live = controlledStream()
    const { user } = renderWithProviders(<FloScreen />)
    await user.type(await screen.findByRole('textbox', { name: 'Ask Flo' }), 'Compare{Enter}')
    await act(async () => live.push(exampleStream.slice(0, 1)))
    await user.click(screen.getByRole('button', { name: 'Stop' }))
    await waitFor(() => expect(conversation().getByText('Stopped. This answer is incomplete.')).toBeInTheDocument())
    expect(liveRegion()).toHaveTextContent('Stopped. This answer is incomplete.')
    expect(screen.getByRole('textbox', { name: 'Ask Flo' })).toBeEnabled()
  })

  it('sends the chosen answer style and remembers it', async () => {
    let mode = ''
    server.use(
      http.post(`${API}/flo/chat`, async ({ request }) => {
        mode = ((await request.json()) as { mode: string }).mode
        return sseResponse(toSse(declinedStream))
      }),
    )
    const { user } = renderWithProviders(<FloScreen />)
    await user.click(await screen.findByRole('radio', { name: /Thorough/ }))
    await user.type(screen.getByRole('textbox', { name: 'Ask Flo' }), 'Joke{Enter}')
    await waitFor(() => expect(conversation().getByText(/I can only answer questions/)).toBeInTheDocument())
    expect(mode).toBe('THOROUGH')
    expect(localStorage.getItem('roundflow.flo.mode')).toBe('THOROUGH')
    // The announcement for a decline is the fixed copy.
    expect(liveRegion()).toHaveTextContent('I can only answer questions about your own RoundFlow data')
  })

  it('starts a new chat', async () => {
    const { user } = renderWithProviders(<FloScreen />)
    await user.click(await screen.findByRole('button', { name: 'Compare my technicians for October' }))
    await screen.findByRole('table')
    await user.click(screen.getByRole('button', { name: 'New chat' }))
    expect(await screen.findByRole('heading', { name: 'What would you like to know?' })).toBeInTheDocument()
    expect(liveRegion()).toBeEmptyDOMElement()
  })

  it('shows one question left, and the fallback styles while status is loading', async () => {
    server.use(http.get(`${API}/flo/status`, () => HttpResponse.json({ ...floStatus, dailyRemaining: 1 })))
    renderWithProviders(<FloScreen />)
    expect(screen.getAllByRole('radio').map((radio) => (radio as HTMLInputElement).value)).toEqual(['THOROUGH', 'BALANCED', 'QUICK'])
    expect(await screen.findByText('1 question left today')).toBeInTheDocument()
  })

  it('says so when Flo is switched off, and stops suggestions and the box', async () => {
    server.use(http.get(`${API}/flo/status`, () => HttpResponse.json({ ...floStatus, enabled: false })))
    renderWithProviders(<FloScreen />)
    expect(await screen.findByRole('alert')).toHaveTextContent('Flo is not switched on for this account.')
    expect(screen.getByRole('textbox', { name: 'Ask Flo' })).toBeDisabled()
  })

  it('still works when the status call fails', async () => {
    server.use(http.get(`${API}/flo/status`, () => HttpResponse.json({ error: 'x' }, { status: 500 })))
    renderWithProviders(<FloScreen />)
    expect(await screen.findByText('Could not check whether Flo is available.')).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Ask Flo' })).toBeEnabled()
  })

  it('opens an old conversation from History, and deletes one (resetting the open chat)', async () => {
    let conversations = [
      { id: 'c1', title: 'October review' },
      { id: 'c2', title: '' },
    ]
    server.use(
      http.get(`${API}/flo/conversations`, () => HttpResponse.json({ conversations, nextCursor: null })),
      http.get(`${API}/flo/conversations/c1`, () =>
        HttpResponse.json({ id: 'c1', messages: [{ id: 'u1', role: 'USER', text: 'Old question' }, exampleFinalMessage] }),
      ),
      http.delete(`${API}/flo/conversations/:id`, ({ params }) => {
        conversations = conversations.filter((conversation) => conversation.id !== params.id)
        return new HttpResponse(null, { status: 204 })
      }),
    )
    const { user } = renderWithProviders(<FloScreen />)
    await user.click(screen.getByRole('button', { name: 'History' }))
    await user.click(await screen.findByRole('button', { name: 'Open October review' }))
    expect(await screen.findByText('Old question')).toBeInTheDocument()
    expect(screen.getByRole('table', { name: 'Performance by technician' })).toBeInTheDocument()

    // Deleting a conversation that is not open keeps the chat; deleting the open one resets it.
    await user.click(screen.getByRole('button', { name: 'History' }))
    await user.click(await screen.findByRole('button', { name: 'Delete Untitled chat' }))
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(screen.getByText('Old question')).toBeInTheDocument()

    await user.click(await screen.findByRole('button', { name: 'Delete October review' }))
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    expect(await screen.findByRole('heading', { name: 'What would you like to know?' })).toBeInTheDocument()
  })

  it('reports a conversation that cannot be opened', async () => {
    server.use(
      http.get(`${API}/flo/conversations`, () => HttpResponse.json({ conversations: [{ id: 'c1', title: 'Gone' }] })),
      http.get(`${API}/flo/conversations/c1`, () => HttpResponse.json({ error: 'x' }, { status: 404 })),
    )
    const { user } = renderWithProviders(<FloScreen />)
    await user.click(screen.getByRole('button', { name: 'History' }))
    await user.click(await screen.findByRole('button', { name: 'Open Gone' }))
    expect(await screen.findByText('Could not open that conversation.')).toBeInTheDocument()
  })

  it('asks a follow-up from the answer, announces an error, and announces a message it cannot display', async () => {
    const { user } = renderWithProviders(<FloScreen />)
    await user.click(await screen.findByRole('button', { name: 'Compare my technicians for October' }))
    await user.click(await screen.findByRole('button', { name: 'Compare with September' }))
    await waitFor(() => expect(screen.getAllByRole('article')).toHaveLength(2))

    server.use(http.post(`${API}/flo/chat`, () => HttpResponse.json({ error: 'x', code: 'FLO_TIMEOUT' }, { status: 504 })))
    await user.type(screen.getByRole('textbox', { name: 'Ask Flo' }), 'Slow one{Enter}')
    await waitFor(() => expect(liveRegion()).toHaveTextContent('That took too long. Try Balanced or Quick.'))

    server.use(
      http.get(`${API}/flo/conversations`, () => HttpResponse.json({ conversations: [{ id: 'c5', title: 'Odd' }] })),
      http.get(`${API}/flo/conversations/c5`, () =>
        HttpResponse.json({ id: 'c5', messages: [{ id: 'm5', role: 'ASSISTANT', status: 'OK', answer: null }] }),
      ),
    )
    await user.click(screen.getByRole('button', { name: 'History' }))
    await user.click(await screen.findByRole('button', { name: 'Open Odd' }))
    await waitFor(() => expect(liveRegion()).toHaveTextContent('Flo’s answer could not be displayed.'))
  })
})
