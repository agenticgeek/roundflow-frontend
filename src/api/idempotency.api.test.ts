import { beforeEach, describe, expect, it, vi } from 'vitest'
import { HttpResponse, http } from 'msw'
import { chatApi } from '@/api/chat.api'
import { customersApi } from '@/api/customers.api'
import { invoicesApi } from '@/api/invoices.api'
import { messagesApi } from '@/api/messages.api'
import { server } from '@/test/msw/server'
import { API } from '@/test/msw/typed'

vi.mock('@/lib/supabase', () => ({
  getCachedAccessToken: () => 'token',
  refreshAccessToken: vi.fn(),
  supabase: { auth: { signOut: vi.fn() } },
}))

const seen: Record<string, (string | null)[]> = {}

beforeEach(() => {
  for (const key of Object.keys(seen)) delete seen[key]
  const record = (path: string) =>
    http.post(`${API}${path}`, ({ request }) => {
      ;(seen[path] ??= []).push(request.headers.get('idempotency-key'))
      return HttpResponse.json({})
    })
  server.use(record('/invoices'), record('/customers'), record('/messages/send'), record('/messages/bulk'), record('/messages/inbox/read'))
})

describe('Idempotency-Key on admin writes (Wave 2B-1)', () => {
  it('POST /invoices sends one key per action and reuses it when the same input is retried', async () => {
    const input = { visitId: 'v1' }
    await invoicesApi.create(input)
    await invoicesApi.create(input)
    await invoicesApi.create({ visitId: 'v1' })
    const [first, again, other] = seen['/invoices']!
    expect(first).toBeTruthy()
    expect(again).toBe(first)
    expect(other).not.toBe(first)
  })

  it('POST /customers, /messages/send, /messages/bulk and /messages/inbox/read carry a key', async () => {
    await customersApi.create({ name: 'Jo' } as never)
    await messagesApi.send({ customerId: 'c1', channel: 'sms', body: 'Hi' })
    await messagesApi.bulk({ roundId: 'r1', channel: 'sms', body: 'Hi' } as never)
    await chatApi.markInboxRead({ customerId: 'c1' })
    for (const path of ['/customers', '/messages/send', '/messages/bulk', '/messages/inbox/read']) {
      expect(seen[path]![0], path).toMatch(/^[0-9a-f-]{36}$/)
    }
  })
})
