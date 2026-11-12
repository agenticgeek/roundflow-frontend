import { HttpResponse, http } from 'msw'
import type { FloStatus, FloSuggestions } from '@/api/flo.api'
import { exampleStream, toSse } from '@/test/flo-fixtures'
import { API } from '@/test/msw/typed'

/**
 * A `text/event-stream` response. `chunkSize` cuts the body into pieces of that many characters,
 * so a test can replay the stream split mid-line and mid-JSON.
 */
export function sseResponse(body: string, chunkSize = 0) {
  const encoder = new TextEncoder()
  const pieces: string[] = []
  for (let at = 0; at < body.length; at += chunkSize || body.length) pieces.push(body.slice(at, at + (chunkSize || body.length)))
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const piece of pieces) controller.enqueue(encoder.encode(piece))
      controller.close()
    },
  })
  return new HttpResponse(stream, { headers: { 'Content-Type': 'text/event-stream' } })
}

export const floStatus: FloStatus = {
  enabled: true,
  dailyRemaining: 42,
  modes: [
    { key: 'THOROUGH', label: 'Thorough', description: 'Deepest analysis' },
    { key: 'BALANCED', label: 'Balanced', description: 'Good detail at a steady pace' },
    { key: 'QUICK', label: 'Quick', description: 'One-line answers' },
  ],
}

export const floSuggestions: FloSuggestions = {
  groups: [
    { area: 'Payments', questions: ['Who owes more than £50?', 'Show failed payments this month'] },
    { area: 'Technicians', questions: ['Compare my technicians for October'] },
  ],
}

/** Happy-path defaults for the Flo endpoints; tests override with `server.use()`. */
export const floHandlers = [
  http.get(`${API}/flo/status`, () => HttpResponse.json(floStatus)),
  http.get(`${API}/flo/suggestions`, () => HttpResponse.json(floSuggestions)),
  http.get(`${API}/flo/conversations`, () => HttpResponse.json({ conversations: [], nextCursor: null })),
  http.post(`${API}/flo/chat`, () => sseResponse(toSse(exampleStream))),
]
