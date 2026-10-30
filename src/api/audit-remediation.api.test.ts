import { describe, expect, it } from 'vitest'
import { HttpResponse } from 'msw'
import { invitesApi } from '@/api/invites.api'
import { paymentsApi } from '@/api/payments.api'
import { reportsApi } from '@/api/reports.api'
import { settingsApi } from '@/api/settings.api'
import { setupApi } from '@/api/setup.api'
import { techniciansApi } from '@/api/technicians.api'
import { ApiError } from '@/lib/errors'
import { NetworkError } from '@/lib/network-error'
import { server } from '@/test/msw/server'
import { apiError, on, specJson } from '@/test/msw/typed'
import { GHL_WEBHOOK_URL } from '@/test/msw/handlers/settings'
import { technicianFixture } from '@/test/msw/handlers/technicians'

describe('GAP-004 technicians send serviceAreaIds', () => {
  it('POST /technicians carries every area', async () => {
    let body: unknown
    server.use(
      on('post', '/technicians', async ({ request }) => {
        body = await request.json()
        return specJson('/technicians', 'post', 201, technicianFixture())
      }),
    )
    await techniciansApi.create({ name: 'Sam', serviceAreaIds: ['a1', 'a2'], sendInvite: true })
    expect(body).toEqual({ name: 'Sam', serviceAreaIds: ['a1', 'a2'], sendInvite: true })
  })

  it('PATCH /technicians/:id replaces the areas', async () => {
    let body: unknown
    server.use(
      on('patch', '/technicians/{id}', async ({ request }) => {
        body = await request.json()
        return specJson('/technicians/{id}', 'patch', 200, technicianFixture())
      }),
    )
    await techniciansApi.update('t1', { serviceAreaIds: [] })
    expect(body).toEqual({ serviceAreaIds: [] })
  })
})

describe('GAP-024 /reports/activity is paginated', () => {
  it('returns the page as-is', async () => {
    server.use(
      on('get', '/reports/activity', () =>
        specJson('/reports/activity', 'get', 200, {
          rows: [{ id: 'a1', type: 'VISIT_COMPLETED', message: 'Done', actorName: 'Jo', createdAt: '2026-10-30T10:00:00Z' }],
          pagination: { page: 1, pageSize: 50, total: 1, totalPages: 1 },
        }),
      ),
    )
    const page = await reportsApi.activity({ type: 'VISIT_COMPLETED' })
    expect(page.rows).toHaveLength(1)
    expect(page.pagination.total).toBe(1)
  })

  it('still accepts a bare array from an older backend', async () => {
    server.use(on('get', '/reports/activity', () => HttpResponse.json([])))
    expect(await reportsApi.activity()).toEqual({
      rows: [],
      pagination: { page: 1, pageSize: 0, total: 0, totalPages: 1 },
    })
  })
})

describe('GAP-027 PATCH /payments/:id/status', () => {
  it('sends the status and returns the payment', async () => {
    let body: unknown
    server.use(
      on('patch', '/payments/{id}/status', async ({ request, params }) => {
        body = await request.json()
        return specJson('/payments/{id}/status', 'patch', 200, { id: String(params.id), status: 'PAID' })
      }),
    )
    await expect(paymentsApi.setStatus('pay 1', 'PAID')).resolves.toMatchObject({ id: 'pay 1', status: 'PAID' })
    expect(body).toEqual({ status: 'PAID' })
  })

  it('turns a 409 into an ApiError with the server message', async () => {
    server.use(on('patch', '/payments/{id}/status', () => apiError(409, 'Payment is already PAID')))
    await expect(paymentsApi.setStatus('p1', 'PAID')).rejects.toMatchObject({
      status: 409,
      message: 'Payment is already PAID',
    })
  })
})

describe('GAP-017 GoHighLevel private connect', () => {
  it('posts the key and location, returning the webhook URL', async () => {
    let body: unknown
    server.use(
      on('post', '/settings/ghl/connect-private', async ({ request }) => {
        body = await request.json()
        return specJson('/settings/ghl/connect-private', 'post', 200, {
          status: 'connected',
          method: 'private',
          webhookUrl: GHL_WEBHOOK_URL,
        })
      }),
    )
    await expect(settingsApi.connectGhlPrivate({ apiKey: 'pit-1', locationId: 'loc' })).resolves.toMatchObject({
      webhookUrl: GHL_WEBHOOK_URL,
    })
    expect(body).toEqual({ apiKey: 'pit-1', locationId: 'loc' })
  })

  it('relays GHL rejecting the key', async () => {
    server.use(on('post', '/settings/ghl/connect-private', () => apiError(400, 'GHL API key or location ID is invalid')))
    await expect(settingsApi.connectGhlPrivate({ apiKey: 'x', locationId: 'y' })).rejects.toBeInstanceOf(ApiError)
  })

  it('disconnects', async () => {
    await expect(settingsApi.disconnectGhl()).resolves.toEqual({ status: 'disconnected' })
  })
})

describe('GAP-011 invites', () => {
  it('lists and resends', async () => {
    await expect(invitesApi.list()).resolves.toEqual([])
    await expect(invitesApi.resend('inv 1')).resolves.toMatchObject({ id: 'inv 1' })
  })
})

describe('Phase 2: POST /setup/step/2 never sends the connect flags', () => {
  it('sends only the payment rules', async () => {
    let body: unknown
    server.use(
      on('post', '/setup/step/2', async ({ request }) => {
        body = await request.json()
        return HttpResponse.json({})
      }),
    )
    await setupApi.saveStep2({ paymentRule: 'COLLECT_AFTER_VISIT', debtHoldEnabled: true, vatInInvoices: false })
    expect(body).not.toHaveProperty('gocardlessConnected')
    expect(body).not.toHaveProperty('stripeConnected')
  })
})

describe('GAP-005 transport failures', () => {
  it('a failed fetch becomes a NetworkError, not an ApiError', async () => {
    server.use(on('get', '/technicians', () => HttpResponse.error()))
    const error = await techniciansApi.list().catch((caught: unknown) => caught)
    expect(error).toBeInstanceOf(NetworkError)
    expect((error as Error).message).toBe('Can’t reach RoundFlow')
  })

  it('an aborted request stays an abort', async () => {
    const controller = new AbortController()
    controller.abort()
    await expect(techniciansApi.list(controller.signal)).rejects.toMatchObject({ name: 'AbortError' })
  })
})
