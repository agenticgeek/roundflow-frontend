import { describe, expect, it } from 'vitest'
import { HttpResponse, http } from 'msw'
import { closuresApi } from '@/api/closures.api'
import { server } from '@/test/msw/server'
import { API } from '@/test/msw/typed'

const closure = {
  id: 'c1', label: 'Christmas', startDate: '2026-12-24', endDate: '2027-01-03', mode: 'MOVE', notifyCustomers: false,
  roundIds: [], appliedAt: null, createdAt: 'x', updatedAt: 'x',
}

describe('closuresApi', () => {
  it('lists with and without from/to, and with only one of them', async () => {
    const urls: string[] = []
    server.use(
      http.get(`${API}/closures`, ({ request }) => {
        urls.push(new URL(request.url).search)
        return HttpResponse.json({ closures: [closure] })
      }),
    )
    expect((await closuresApi.list()).closures).toHaveLength(1)
    await closuresApi.list({ from: '2026-12-01', to: '2027-01-31' })
    await closuresApi.list({ from: '2026-12-01' })
    await closuresApi.list({ to: '2027-01-31' }, new AbortController().signal)
    expect(urls).toEqual(['', '?from=2026-12-01&to=2027-01-31', '?from=2026-12-01', '?to=2027-01-31'])
  })

  it('creates with POST and the JSON body', async () => {
    let seen: unknown
    server.use(
      http.post(`${API}/closures`, async ({ request }) => {
        seen = { body: await request.json(), type: request.headers.get('content-type') }
        return HttpResponse.json(closure, { status: 201 })
      }),
    )
    const input = { label: 'Christmas', startDate: '2026-12-24', endDate: '2027-01-03', mode: 'MOVE' as const }
    expect(await closuresApi.create(input)).toMatchObject({ id: 'c1' })
    expect(seen).toEqual({ body: input, type: 'application/json' })
  })

  it('updates with PATCH to the closure id', async () => {
    let seen: unknown
    server.use(
      http.patch(`${API}/closures/c1`, async ({ request }) => {
        seen = await request.json()
        return HttpResponse.json({ ...closure, label: 'Staff holiday' })
      }),
    )
    expect((await closuresApi.update('c1', { label: 'Staff holiday' })).label).toBe('Staff holiday')
    expect(seen).toEqual({ label: 'Staff holiday' })
  })

  it('removes with DELETE and resolves to undefined on 204', async () => {
    let method = ''
    server.use(
      http.delete(`${API}/closures/c1`, ({ request }) => {
        method = request.method
        return new HttpResponse(null, { status: 204 })
      }),
    )
    await expect(closuresApi.remove('c1')).resolves.toBeUndefined()
    expect(method).toBe('DELETE')
  })

  it('previews with a body-less POST', async () => {
    let seen: { method: string; text: string; key: string | null } | undefined
    server.use(
      http.post(`${API}/closures/c1/apply/preview`, async ({ request }) => {
        seen = { method: request.method, text: await request.text(), key: request.headers.get('idempotency-key') }
        return HttpResponse.json({ closureId: 'c1', mode: 'MOVE' })
      }),
    )
    expect(await closuresApi.previewApply('c1')).toMatchObject({ closureId: 'c1' })
    expect(seen).toEqual({ method: 'POST', text: '', key: null })
  })

  it('applies with the body and the Idempotency-Key header, and defaults the body to {}', async () => {
    const seen: { body: unknown; key: string | null }[] = []
    server.use(
      http.post(`${API}/closures/c1/apply`, async ({ request }) => {
        seen.push({ body: await request.json(), key: request.headers.get('idempotency-key') })
        return HttpResponse.json({ closureId: 'c1', mode: 'MOVE', moved: 2 })
      }),
    )
    expect((await closuresApi.apply('c1', { notifyCustomers: true }, 'key-1')).moved).toBe(2)
    await closuresApi.apply('c1')
    expect(seen).toEqual([
      { body: { notifyCustomers: true }, key: 'key-1' },
      { body: {}, key: null },
    ])
  })

  it('propagates the server error code and message', async () => {
    server.use(
      http.post(`${API}/closures/c1/apply`, () =>
        HttpResponse.json({ error: 'Closure has ended', code: 'CLOSURE_ENDED' }, { status: 409 }),
      ),
      http.patch(`${API}/closures/nope`, () => HttpResponse.json({ error: 'Not found', code: 'CLOSURE_NOT_FOUND' }, { status: 404 })),
    )
    await expect(closuresApi.apply('c1')).rejects.toMatchObject({ status: 409, code: 'CLOSURE_ENDED' })
    await expect(closuresApi.update('nope', {})).rejects.toMatchObject({ status: 404, code: 'CLOSURE_NOT_FOUND' })
  })
})
