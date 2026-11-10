import { afterEach, describe, expect, it, vi } from 'vitest'
import { HttpResponse, http } from 'msw'
import { floApi } from '@/api/flo.api'
import { apiStream, readSseEvents } from '@/api/stream'
import { ApiError } from '@/lib/errors'
import { declinedStream, exampleStream, toSse } from '@/test/flo-fixtures'
import { sseResponse } from '@/test/msw/handlers/flo'
import { server } from '@/test/msw/server'
import { API } from '@/test/msw/typed'

afterEach(() => vi.restoreAllMocks())

async function collect(body: ReadableStream<Uint8Array>) {
  const events = []
  for await (const event of readSseEvents(body)) events.push(event)
  return events
}

describe('floApi', () => {
  it('calls every endpoint (ids are URL-encoded, delete answers 204)', async () => {
    const seen: string[] = []
    server.use(
      http.get(`${API}/flo/conversations/:id`, ({ params }) => {
        seen.push(`get ${String(params.id)}`)
        return HttpResponse.json({ id: 'a b', messages: [] })
      }),
      http.delete(`${API}/flo/conversations/:id`, ({ params }) => {
        seen.push(`delete ${String(params.id)}`)
        return new HttpResponse(null, { status: 204 })
      }),
    )
    expect((await floApi.status()).enabled).toBe(true)
    expect((await floApi.suggestions()).groups).toHaveLength(2)
    expect((await floApi.conversations()).conversations).toEqual([])
    expect((await floApi.conversation('a b')).messages).toEqual([])
    await expect(floApi.deleteConversation('a b')).resolves.toBeUndefined()
    expect(seen).toEqual(['get a b', 'delete a b'])
  })

  it('surfaces the error code of a failed call', async () => {
    server.use(http.get(`${API}/flo/status`, () => HttpResponse.json({ error: 'Admins only', code: 'ADMIN_ONLY' }, { status: 403 })))
    await expect(floApi.status()).rejects.toMatchObject({ status: 403, code: 'ADMIN_ONLY' })
  })
})

describe('apiStream', () => {
  it('posts with the bearer token, asks for an event stream and yields the recorded events', async () => {
    let seen: { auth: string | null; accept: string | null; key: string | null; body: unknown } | null = null
    server.use(
      http.post(`${API}/flo/chat`, async ({ request }) => {
        seen = {
          auth: request.headers.get('authorization'),
          accept: request.headers.get('accept'),
          key: request.headers.get('idempotency-key'),
          body: await request.json(),
        }
        return sseResponse(toSse(exampleStream))
      }),
    )
    const body = await apiStream('/flo/chat', { method: 'POST', body: JSON.stringify({ message: 'hi' }), idempotencyKey: 'key-1' })
    const events = await collect(body)
    expect(seen).toEqual({ auth: 'Bearer test-token', accept: 'text/event-stream', key: 'key-1', body: { message: 'hi' } })
    expect(events.map((event) => event.event)).toEqual(exampleStream.map(([event]) => event))
  })

  it('reassembles events from a stream cut into tiny chunks, with CRLF line ends', async () => {
    server.use(http.post(`${API}/flo/chat`, () => sseResponse(toSse(declinedStream, '\r\n'), 7)))
    const events = await collect(await apiStream('/flo/chat', { method: 'POST' }))
    expect(events.map((event) => event.event)).toEqual(['start', 'declined', 'done'])
  })

  it('ends quietly on an empty stream and drops an unfinished event', async () => {
    server.use(http.post(`${API}/flo/chat`, () => sseResponse('')))
    expect(await collect(await apiStream('/flo/chat', { method: 'POST' }))).toEqual([])
    server.use(http.post(`${API}/flo/chat`, () => sseResponse('event: done\ndata: {"mes')))
    expect(await collect(await apiStream('/flo/chat', { method: 'POST' }))).toEqual([])
  })

  it('turns an HTTP error before the stream starts into an ApiError (JSON or not)', async () => {
    server.use(http.post(`${API}/flo/chat`, () => HttpResponse.json({ error: 'Limit', code: 'FLO_DAILY_LIMIT' }, { status: 429 })))
    await expect(apiStream('/flo/chat', { method: 'POST' })).rejects.toMatchObject({ status: 429, code: 'FLO_DAILY_LIMIT' })
    server.use(http.post(`${API}/flo/chat`, () => new HttpResponse('<html>bad gateway</html>', { status: 502 })))
    await expect(apiStream('/flo/chat', { method: 'POST' })).rejects.toBeInstanceOf(ApiError)
  })

  it('rejects a 200 with no body', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response(null, { status: 200 }))
    await expect(apiStream('/flo/chat', { method: 'POST' })).rejects.toMatchObject({ status: 200, message: 'The server sent an empty stream' })
  })

  it('stops reading when the request is aborted', async () => {
    server.use(
      http.post(`${API}/flo/chat`, () => {
        const stream = new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(new TextEncoder().encode(': ping\n\n'))
          },
        })
        return new HttpResponse(stream, { headers: { 'Content-Type': 'text/event-stream' } })
      }),
    )
    const abort = new AbortController()
    const body = await apiStream('/flo/chat', { method: 'POST', signal: abort.signal })
    const reading = collect(body)
    const onError = vi.fn()
    reading.catch(onError)
    abort.abort()
    await expect(reading).rejects.toBeTruthy()
    expect(onError).toHaveBeenCalled()
  })
})
