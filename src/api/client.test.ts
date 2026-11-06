import { beforeEach, describe, expect, it, vi } from 'vitest'
import { HttpResponse, http } from 'msw'
import { api, apiBlob } from '@/api/client'
import { ApiError } from '@/lib/errors'
import { server } from '@/test/msw/server'
import { API } from '@/test/msw/typed'

const sessionMocks = vi.hoisted(() => ({
  cached: vi.fn(),
  refresh: vi.fn(),
  expired: vi.fn(),
}))

vi.mock('@/lib/supabase', () => ({
  getCachedAccessToken: sessionMocks.cached,
  refreshAccessToken: sessionMocks.refresh,
  supabase: { auth: { signOut: vi.fn() } },
}))
vi.mock('@/lib/session-expiry', () => ({ handleSessionExpired: sessionMocks.expired }))

beforeEach(() => {
  sessionMocks.cached.mockReset().mockReturnValue('stale')
  sessionMocks.refresh.mockReset().mockResolvedValue('fresh')
  sessionMocks.expired.mockReset().mockResolvedValue(undefined)
})

describe('api() 401 handling (WEB-01)', () => {
  it('refreshes the session and re-sends a POST body once, then succeeds', async () => {
    const seen: { auth: string | null; body: unknown }[] = []
    server.use(
      http.post(`${API}/things`, async ({ request }) => {
        seen.push({ auth: request.headers.get('authorization'), body: await request.json() })
        return seen.length === 1
          ? HttpResponse.json({ error: 'expired' }, { status: 401 })
          : HttpResponse.json({ ok: true })
      }),
    )

    await expect(api('/things', { method: 'POST', body: JSON.stringify({ name: 'x' }) })).resolves.toEqual({ ok: true })

    expect(seen).toEqual([
      { auth: 'Bearer stale', body: { name: 'x' } },
      { auth: 'Bearer fresh', body: { name: 'x' } },
    ])
    expect(sessionMocks.expired).not.toHaveBeenCalled()
  })

  it('signs out and surfaces the 401 when the retry is also rejected', async () => {
    let calls = 0
    server.use(
      http.patch(`${API}/things/1`, () => {
        calls += 1
        return HttpResponse.json({ error: 'still no' }, { status: 401 })
      }),
    )

    await expect(api('/things/1', { method: 'PATCH', body: '{}' })).rejects.toMatchObject({ status: 401 })
    expect(calls).toBe(2)
    expect(sessionMocks.expired).toHaveBeenCalledTimes(1)
  })

  it('signs out without retrying when the refresh returns the same token or nothing', async () => {
    let calls = 0
    server.use(
      http.get(`${API}/things`, () => {
        calls += 1
        return HttpResponse.json({ error: 'no' }, { status: 401 })
      }),
    )
    sessionMocks.refresh.mockResolvedValue('stale')
    await expect(api('/things')).rejects.toBeInstanceOf(ApiError)
    expect(calls).toBe(1)

    sessionMocks.refresh.mockResolvedValue(null)
    await expect(api('/things')).rejects.toBeInstanceOf(ApiError)
    expect(sessionMocks.expired).toHaveBeenCalledTimes(2)
  })

  it('leaves provisioning (explicit token) and public calls alone', async () => {
    server.use(http.get(`${API}/things`, () => HttpResponse.json({ error: 'no' }, { status: 401 })))
    await expect(api('/things', { accessToken: 'explicit' })).rejects.toMatchObject({ status: 401 })
    await expect(api('/things', { public: true })).rejects.toMatchObject({ status: 401 })
    expect(sessionMocks.refresh).not.toHaveBeenCalled()
    expect(sessionMocks.expired).not.toHaveBeenCalled()
  })

  it('applies to blob downloads as well', async () => {
    server.use(http.get(`${API}/file`, () => HttpResponse.json({ error: 'no' }, { status: 401 })))
    await expect(apiBlob('/file')).rejects.toMatchObject({ status: 401 })
    expect(sessionMocks.expired).toHaveBeenCalledTimes(1)
  })
})

describe('api() request building', () => {
  it('uses a cold-start session read when no token is cached, and merges caller headers', async () => {
    sessionMocks.cached.mockReturnValue(null)
    sessionMocks.refresh.mockResolvedValue('cold')
    const seen: Record<string, string | null>[] = []
    server.use(
      http.post(`${API}/things`, ({ request }) => {
        seen.push({
          auth: request.headers.get('authorization'),
          type: request.headers.get('content-type'),
          custom: request.headers.get('x-custom'),
        })
        return HttpResponse.json({ ok: true })
      }),
    )
    await api('/things', { method: 'POST', body: '{}', headers: { 'X-Custom': 'yes' } })
    expect(seen).toEqual([{ auth: 'Bearer cold', type: 'application/json', custom: 'yes' }])
  })

  it('refuses to call a private endpoint when signed out, but lets a public one through unauthenticated', async () => {
    sessionMocks.cached.mockReturnValue(null)
    sessionMocks.refresh.mockResolvedValue(null)
    await expect(api('/things')).rejects.toMatchObject({ status: 401, message: 'Not signed in' })

    let auth: string | null = 'unset'
    server.use(
      http.get(`${API}/open`, ({ request }) => {
        auth = request.headers.get('authorization')
        return HttpResponse.json({ ok: true })
      }),
    )
    await expect(api('/open', { public: true })).resolves.toEqual({ ok: true })
    expect(auth).toBeNull()
  })

  it('turns error bodies into ApiError, falling back from error to message to a default', async () => {
    server.use(
      http.get(`${API}/a`, () => HttpResponse.json({ error: 'Nope', code: 'X', fields: { name: 'bad' } }, { status: 400 })),
      http.get(`${API}/b`, () => HttpResponse.json({ message: 'From message' }, { status: 500 })),
      http.get(`${API}/c`, () => new HttpResponse('not json', { status: 502 })),
      http.get(`${API}/d`, () => new HttpResponse(null, { status: 204 })),
    )
    await expect(api('/a')).rejects.toMatchObject({ message: 'Nope', code: 'X', fields: { name: 'bad' } })
    await expect(api('/b')).rejects.toMatchObject({ message: 'From message' })
    await expect(api('/c')).rejects.toMatchObject({ message: 'Request failed', status: 502 })
    await expect(api('/d')).resolves.toBeUndefined()
  })

  it('sends Idempotency-Key when given, and re-sends the same key on the 401 retry', async () => {
    const keys: (string | null)[] = []
    server.use(
      http.post(`${API}/once`, ({ request }) => {
        keys.push(request.headers.get('idempotency-key'))
        return keys.length === 1 ? HttpResponse.json({ error: 'expired' }, { status: 401 }) : HttpResponse.json({ ok: true })
      }),
      http.post(`${API}/plain`, ({ request }) => HttpResponse.json({ key: request.headers.get('idempotency-key') })),
    )
    await api('/once', { method: 'POST', body: '{}', idempotencyKey: 'key-1' })
    expect(keys).toEqual(['key-1', 'key-1'])
    await expect(api('/plain', { method: 'POST', body: '{}' })).resolves.toEqual({ key: null })
  })

  it('puts the request id and Retry-After on the ApiError, and normalises the new fields list', async () => {
    server.use(
      http.post(`${API}/limited`, () =>
        HttpResponse.json({ error: 'Slow down', code: 'RATE_LIMITED' }, { status: 429, headers: { 'Retry-After': '9', 'X-Request-Id': 'req_42' } }),
      ),
      http.get(`${API}/invalid`, () =>
        HttpResponse.json({ error: 'Invalid', fields: [{ path: 'email', code: 'X', message: 'Bad email' }] }, { status: 400 }),
      ),
    )
    await expect(api('/limited', { method: 'POST', body: '{}' })).rejects.toMatchObject({ status: 429, retryAfterSeconds: 9, requestId: 'req_42' })
    await expect(apiBlob('/invalid')).rejects.toMatchObject({ fields: { email: 'Bad email' } })
  })

  it('apiBlob returns the bytes, and builds the same error messages', async () => {
    server.use(
      http.get(`${API}/file`, () => new HttpResponse('pdf-bytes', { status: 200 })),
      http.get(`${API}/bad1`, () => HttpResponse.json({ error: 'Gone' }, { status: 404 })),
      http.get(`${API}/bad2`, () => HttpResponse.json({ message: 'Server said' }, { status: 500 })),
      http.get(`${API}/bad3`, () => HttpResponse.json({}, { status: 500 })),
    )
    expect(await (await apiBlob('/file')).text()).toBe('pdf-bytes')
    await expect(apiBlob('/bad1')).rejects.toMatchObject({ message: 'Gone' })
    await expect(apiBlob('/bad2')).rejects.toMatchObject({ message: 'Server said' })
    await expect(apiBlob('/bad3')).rejects.toMatchObject({ message: 'Request failed' })
  })
})
