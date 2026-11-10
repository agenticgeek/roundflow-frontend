import { requestWithAuth } from '@/api/client'
import { apiErrorFromResponse } from '@/lib/api-error'
import { ApiError } from '@/lib/errors'
import { createSseParser, type SseEvent } from '@/features/flo/lib/sse'

type StreamInit = NonNullable<Parameters<typeof requestWithAuth>[1]>

/**
 * `api()` for a `text/event-stream` answer (Flo): same bearer token, 401 refresh-and-retry and
 * network-error handling, but the body is handed back unread. An error status before the stream
 * starts is still a JSON `ApiError`. Cancel by passing an `AbortSignal` in `init`.
 */
export async function apiStream(path: string, init: StreamInit = {}): Promise<ReadableStream<Uint8Array>> {
  const response = await requestWithAuth(path, {
    ...init,
    headers: { Accept: 'text/event-stream', ...(init.headers ?? {}) },
  })
  if (!response.ok) {
    throw apiErrorFromResponse(response, await response.json().catch(() => ({})))
  }
  if (!response.body) throw new ApiError(response.status, 'The server sent an empty stream')
  return response.body
}

/** The SSE events of a response body, in order. Ends when the stream ends; an unfinished event is dropped. */
export async function* readSseEvents(body: ReadableStream<Uint8Array>): AsyncGenerator<SseEvent> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  const parser = createSseParser()
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) return
      yield* parser.push(decoder.decode(value, { stream: true }))
    }
  } finally {
    reader.releaseLock()
  }
}
