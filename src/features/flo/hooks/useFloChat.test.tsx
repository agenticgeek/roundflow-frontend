import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { HttpResponse, http } from 'msw'
import { QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { FloMode } from '@/api/flo.api'
import { useFloChat } from '@/features/flo/hooks/useFloChat'
import { declinedStream, errorStream, exampleFinalMessage, exampleStream, toSse, type RecordedEvent } from '@/test/flo-fixtures'
import { sseResponse } from '@/test/msw/handlers/flo'
import { server } from '@/test/msw/server'
import { API } from '@/test/msw/typed'
import { createTestQueryClient } from '@/test/render'

function setup(initialMode: FloMode = 'BALANCED') {
  const client = createTestQueryClient()
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
  return renderHook(({ mode }) => useFloChat(mode), { wrapper, initialProps: { mode: initialMode } })
}

/** A response the test feeds by hand, so it can look at the state half way through the stream. */
function controlledStream() {
  let controller!: ReadableStreamDefaultController<Uint8Array>
  const stream = new ReadableStream<Uint8Array>({ start: (c) => void (controller = c) })
  const encoder = new TextEncoder()
  return {
    response: () => new HttpResponse(stream, { headers: { 'Content-Type': 'text/event-stream' } }),
    push: (events: readonly RecordedEvent[]) => controller.enqueue(encoder.encode(toSse(events))),
    close: () => controller.close(),
    fail: () => controller.error(new Error('connection reset')),
  }
}

type Seen = { body: Record<string, unknown>; key: string | null }

function chatHandler(respond: (call: number) => Response, seen: Seen[] = []) {
  let call = 0
  server.use(
    http.post(`${API}/flo/chat`, async ({ request }) => {
      seen.push({ body: (await request.json()) as Record<string, unknown>, key: request.headers.get('idempotency-key') })
      call += 1
      return respond(call)
    }),
  )
  return seen
}

const assistant = (items: ReturnType<typeof setup>['result']['current']['items']) => items.find((item) => item.kind === 'assistant')

describe('useFloChat', () => {
  it('sends a question, shows the optimistic bubble, streams the answer and ends on the persisted message', async () => {
    const seen = chatHandler(() => sseResponse(toSse(exampleStream)))
    const { result } = setup('QUICK')

    await act(async () => {
      await result.current.send('  How is October going?  ')
    })

    expect(seen[0]?.body).toEqual({ message: 'How is October going?', mode: 'QUICK' })
    expect(seen[0]?.key).toMatch(/^[0-9a-f-]{36}$/)
    expect(result.current.items.map((item) => item.kind)).toEqual(['user', 'assistant'])
    expect(result.current.items[0]).toMatchObject({ text: 'How is October going?' })
    const item = assistant(result.current.items)
    expect(item?.kind === 'assistant' && item.stream.final).toEqual(exampleFinalMessage)
    expect(result.current.streaming).toBe(false)
    expect(result.current.activeId).toBe('c1')
  })

  it('shows live progress while the stream is open, counts seconds, and continues the conversation on the next send', async () => {
    const live = controlledStream()
    const seen = chatHandler((call) => (call === 1 ? live.response() : sseResponse(toSse(declinedStream))))
    const { result } = setup()

    let first!: Promise<void>
    act(() => {
      first = result.current.send('Compare technicians')
    })
    expect(result.current.streaming).toBe(true)
    await act(async () => {
      live.push(exampleStream.slice(0, 3))
    })
    await waitFor(() => {
      const item = assistant(result.current.items)
      expect(item?.kind === 'assistant' && item.stream.view.statuses).toHaveLength(2)
    })
    expect(result.current.activeId).toBe('c1')

    await waitFor(() => expect(result.current.elapsed).toBeGreaterThanOrEqual(1), { timeout: 3000 })

    await act(async () => {
      live.push(exampleStream.slice(3))
      live.close()
      await first
    })
    expect(result.current.streaming).toBe(false)

    await act(async () => {
      await result.current.send('Anything else?')
    })
    expect(seen).toHaveLength(2)
    expect(seen[1]?.body.conversationId).toBe('c1')
    expect(seen[1]?.key).not.toBe(seen[0]?.key)
  })

  it('ignores an empty question and a second send while one is running', async () => {
    const live = controlledStream()
    const seen = chatHandler(() => live.response())
    const { result } = setup()

    await act(async () => {
      await result.current.send('   ')
    })
    expect(result.current.items).toEqual([])

    let first!: Promise<void>
    act(() => {
      first = result.current.send('one')
    })
    await act(async () => {
      await result.current.send('two')
    })
    await act(async () => {
      live.push(declinedStream)
      live.close()
      await first
    })
    expect(seen).toHaveLength(1)
    expect(result.current.items).toHaveLength(2)
  })

  it('shows a decline and an in-stream error, keeping the partial text', async () => {
    chatHandler((call) => sseResponse(toSse(call === 1 ? declinedStream : errorStream)))
    const { result } = setup()
    await act(async () => {
      await result.current.send('Tell me a joke')
    })
    const declined = assistant(result.current.items)
    expect(declined?.kind === 'assistant' && declined.stream.view.declined?.text).toContain('only answer questions')

    act(() => result.current.newChat())
    await act(async () => {
      await result.current.send('Compare')
    })
    const failed = assistant(result.current.items)
    expect(failed?.kind === 'assistant' && failed.stream.view.error).toMatchObject({ code: 'FLO_PROVIDER_ERROR', retryable: true })
    expect(failed?.kind === 'assistant' && failed.stream.view.intro).toHaveLength(1)
  })

  it('skips frames it cannot use', async () => {
    chatHandler(() => sseResponse(`event: mystery\ndata: {}\n\nevent: text\ndata: not json\n\n${toSse(declinedStream)}`))
    const { result } = setup()
    await act(async () => {
      await result.current.send('hi')
    })
    const item = assistant(result.current.items)
    expect(item?.kind === 'assistant' && item.stream.view.declined).not.toBeNull()
  })

  it('recovers a dropped stream once through GET /flo/conversations/:id', async () => {
    chatHandler(() => sseResponse(toSse(exampleStream.slice(0, 8))))
    server.use(http.get(`${API}/flo/conversations/c1`, () => HttpResponse.json({ id: 'c1', messages: [exampleFinalMessage] })))
    const { result } = setup()
    await act(async () => {
      await result.current.send('Compare')
    })
    const item = assistant(result.current.items)
    expect(item?.kind === 'assistant' && item.stream.final?.id).toBe('m1')
    expect(item?.kind === 'assistant' && item.stream.view.error).toBeNull()
  })

  it('recovers when the connection breaks mid-stream', async () => {
    const live = controlledStream()
    chatHandler(() => live.response())
    server.use(http.get(`${API}/flo/conversations/c1`, () => HttpResponse.json({ id: 'c1', messages: [exampleFinalMessage] })))
    const { result } = setup()
    let sending!: Promise<void>
    act(() => {
      sending = result.current.send('Compare')
    })
    await act(async () => {
      live.push(exampleStream.slice(0, 2))
      await new Promise((resolve) => setTimeout(resolve, 20))
      live.fail()
      await sending
    })
    const item = assistant(result.current.items)
    expect(item?.kind === 'assistant' && item.stream.final?.id).toBe('m1')
  })

  it('shows a retryable error when the answer cannot be recovered (message missing, or the lookup fails)', async () => {
    chatHandler(() => sseResponse(toSse(exampleStream.slice(0, 3))))
    server.use(http.get(`${API}/flo/conversations/c1`, () => HttpResponse.json({ id: 'c1', messages: [] })))
    const { result } = setup()
    await act(async () => {
      await result.current.send('Compare')
    })
    let item = assistant(result.current.items)
    expect(item?.kind === 'assistant' && item.stream.view.error).toMatchObject({ code: 'STREAM_DROPPED', retryable: true })

    server.use(http.get(`${API}/flo/conversations/c1`, () => HttpResponse.json({ error: 'x' }, { status: 500 })))
    act(() => result.current.newChat())
    await act(async () => {
      await result.current.send('Compare')
    })
    item = assistant(result.current.items)
    expect(item?.kind === 'assistant' && item.stream.view.error?.code).toBe('STREAM_DROPPED')
  })

  it('shows a dropped stream with no start event as a plain error', async () => {
    chatHandler(() => sseResponse(''))
    const { result } = setup()
    await act(async () => {
      await result.current.send('Compare')
    })
    const item = assistant(result.current.items)
    expect(item?.kind === 'assistant' && item.stream.view.error?.code).toBe('STREAM_DROPPED')
  })

  it('maps an HTTP error before the stream, and forgets a conversation the server no longer has', async () => {
    const seen = chatHandler((call) =>
      call === 1
        ? sseResponse(toSse(declinedStream))
        : call === 2
          ? HttpResponse.json({ error: 'gone', code: 'FLO_CONVERSATION_NOT_FOUND' }, { status: 404 })
          : HttpResponse.json({ error: 'cap', code: 'FLO_DAILY_LIMIT' }, { status: 429 }),
    )
    const { result } = setup()
    await act(async () => {
      await result.current.send('one')
    })
    await act(async () => {
      await result.current.send('two')
    })
    expect(seen[1]?.body.conversationId).toBe('c2')
    expect(result.current.activeId).toBeNull()
    await act(async () => {
      await result.current.send('three')
    })
    expect(seen[2]?.body.conversationId).toBeUndefined()
    const last = result.current.items[result.current.items.length - 1]
    expect(last?.kind === 'assistant' && last.stream.view.error?.code).toBe('FLO_DAILY_LIMIT')
  })

  it('cancels with the abort controller and marks the answer as stopped', async () => {
    const live = controlledStream()
    chatHandler(() => live.response())
    const { result } = setup()
    let sending!: Promise<void>
    act(() => {
      sending = result.current.send('Compare')
    })
    await act(async () => {
      live.push(exampleStream.slice(0, 1))
      await new Promise((resolve) => setTimeout(resolve, 20))
      result.current.cancel()
      await sending
    })
    const item = assistant(result.current.items)
    expect(item?.kind === 'assistant' && item.stream.view).toMatchObject({ streaming: false, stopped: true, error: null })
    expect(result.current.streaming).toBe(false)
  })

  it('cancel does nothing when nothing is running', () => {
    const { result } = setup()
    expect(() => result.current.cancel()).not.toThrow()
  })

  it('marks a stream that ends right after an abort as stopped', async () => {
    const live = controlledStream()
    chatHandler(() => live.response())
    const { result } = setup()
    let sending!: Promise<void>
    act(() => {
      sending = result.current.send('Compare')
    })
    await act(async () => {
      result.current.cancel()
      live.close()
      await sending
    })
    const item = assistant(result.current.items)
    expect(item?.kind === 'assistant' && item.stream.view.stopped).toBe(true)
  })

  it('retries a failed answer: removes it and its question, then asks again', async () => {
    const seen = chatHandler((call) => (call === 1 ? HttpResponse.json({ error: 'x' }, { status: 502 }) : sseResponse(toSse(declinedStream))))
    const { result } = setup()
    await act(async () => {
      await result.current.send('Compare')
    })
    const failedId = result.current.items[1]?.id as string
    act(() => result.current.retry('missing'))
    act(() => result.current.retry(result.current.items[0]?.id as string))
    expect(seen).toHaveLength(1)

    await act(async () => {
      result.current.retry(failedId)
      await waitFor(() => expect(seen).toHaveLength(2))
    })
    await waitFor(() => expect(result.current.streaming).toBe(false))
    expect(seen[1]?.body.message).toBe('Compare')
    expect(result.current.items).toHaveLength(2)
  })

  it('does not retry while an answer is streaming', async () => {
    const live = controlledStream()
    const seen = chatHandler((call) => (call === 1 ? HttpResponse.json({ error: 'x' }, { status: 502 }) : live.response()))
    const { result } = setup()
    await act(async () => {
      await result.current.send('first')
    })
    const failedId = result.current.items[1]?.id as string
    let second!: Promise<void>
    act(() => {
      second = result.current.send('second')
    })
    act(() => result.current.retry(failedId))
    await act(async () => {
      live.push(declinedStream)
      live.close()
      await second
    })
    expect(seen).toHaveLength(2)
  })

  it('opens an old conversation, and starts a new chat', async () => {
    server.use(
      http.get(`${API}/flo/conversations/c9`, () =>
        HttpResponse.json({
          id: 'c9',
          messages: [
            { id: 'u1', role: 'USER', text: 'Earlier question' },
            { id: 'u2', role: 'USER' },
            exampleFinalMessage,
          ],
        }),
      ),
    )
    const { result } = setup()
    await act(async () => {
      await result.current.openConversation('c9')
    })
    expect(result.current.activeId).toBe('c9')
    expect(result.current.items.map((item) => item.kind)).toEqual(['user', 'user', 'assistant'])
    expect(result.current.items[1]).toMatchObject({ text: '' })
    const item = assistant(result.current.items)
    expect(item?.kind === 'assistant' && item.stream.view.intro[0]?.text).toContain('October')

    act(() => result.current.newChat())
    expect(result.current.items).toEqual([])
    expect(result.current.activeId).toBeNull()
  })

  it('reports a conversation that cannot be opened', async () => {
    server.use(http.get(`${API}/flo/conversations/c9`, () => HttpResponse.json({ error: 'x' }, { status: 404 })))
    const { result } = setup()
    await act(async () => {
      await result.current.openConversation('c9')
    })
    expect(result.current.loadError).toBe('Could not open that conversation.')
    expect(result.current.opening).toBe(false)
    expect(result.current.items).toEqual([])
  })
})
