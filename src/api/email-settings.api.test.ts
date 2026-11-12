import { describe, expect, it } from 'vitest'
import { HttpResponse, http } from 'msw'
import { emailSettingsApi } from '@/api/email-settings.api'
import { server } from '@/test/msw/server'
import { on, specJson } from '@/test/msw/typed'

describe('emailSettingsApi', () => {
  it('reads and patches the settings, sends the test email, and checks the domain', async () => {
    const seen: string[] = []
    server.use(
      on('get', '/settings/email', () => {
        seen.push('get')
        return specJson('/settings/email', 'get', 200, { configured: true })
      }),
      on('patch', '/settings/email', async ({ request }) => {
        seen.push(`patch ${JSON.stringify(await request.json())}`)
        return specJson('/settings/email', 'patch', 200, { configured: true })
      }),
      on('post', '/settings/email/test', () => specJson('/settings/email/test', 'post', 200, { sent: true, from: 'a@b.c', tier: 1 })),
      on('get', '/settings/email/domain', () =>
        specJson('/settings/email/domain', 'get', 200, { domain: 'x.co.uk', localPart: null, status: 'PENDING', records: [], verifiedAt: null, tier: 1, sendingAddress: null }),
      ),
      on('post', '/settings/email/domain', async ({ request }) => {
        seen.push(`domain ${JSON.stringify(await request.json())}`)
        return specJson('/settings/email/domain', 'post', 200, { domain: 'x.co.uk', localPart: null, status: 'PENDING', records: [], verifiedAt: null, tier: 1, sendingAddress: null })
      }),
      on('delete', '/settings/email/domain', () =>
        specJson('/settings/email/domain', 'delete', 200, { domain: null, localPart: null, status: 'NONE', records: [], verifiedAt: null, tier: 1, sendingAddress: null }),
      ),
    )
    await emailSettingsApi.get()
    await emailSettingsApi.update({ emailEnabled: true })
    expect(await emailSettingsApi.sendTest()).toMatchObject({ sent: true })
    expect((await emailSettingsApi.checkDomain()).status).toBe('PENDING')
    await emailSettingsApi.startDomain({ domain: 'x.co.uk' })
    expect((await emailSettingsApi.removeDomain()).status).toBe('NONE')
    expect(seen).toEqual(['get', 'patch {"emailEnabled":true}', 'domain {"domain":"x.co.uk"}'])
  })

  it('uploads a logo: signed URL, then PUT of the bytes, then saves the path with its alt text', async () => {
    const seen: unknown[] = []
    server.use(
      on('post', '/settings/email/logo/upload-url', async ({ request }) => {
        seen.push(await request.json())
        return specJson('/settings/email/logo/upload-url', 'post', 200, { signedUrl: 'https://files.example/signed?t=1', token: 't', path: 'tn/branding/logo.png' })
      }),
      http.put('https://files.example/signed', async ({ request }) => {
        seen.push({ put: request.headers.get('content-type'), size: (await request.arrayBuffer()).byteLength })
        return new HttpResponse(null, { status: 200 })
      }),
      on('put', '/settings/email/logo', async ({ request }) => {
        seen.push(await request.json())
        return specJson('/settings/email/logo', 'put', 200, { logoUrl: 'https://img' })
      }),
    )
    const file = new File(['abc'], 'logo.png', { type: 'image/png' })
    expect((await emailSettingsApi.uploadLogo(file, 'Coates Windows')).logoUrl).toBe('https://img')
    expect(seen).toEqual([{ mimeType: 'image/png' }, { put: 'image/png', size: 3 }, { path: 'tn/branding/logo.png', altText: 'Coates Windows' }])
  })

  it('stops with a readable error when the storage upload is refused, and removes a logo', async () => {
    server.use(
      on('post', '/settings/email/logo/upload-url', () =>
        specJson('/settings/email/logo/upload-url', 'post', 200, { signedUrl: 'https://files.example/refused', token: 't', path: 'p' }),
      ),
      http.put('https://files.example/refused', () => new HttpResponse(null, { status: 403 })),
      on('delete', '/settings/email/logo', () => specJson('/settings/email/logo', 'delete', 200, { logoUrl: null })),
    )
    await expect(emailSettingsApi.uploadLogo(new File(['x'], 'l.webp', { type: 'image/webp' }), 'Alt')).rejects.toThrow('The logo could not be uploaded. Try again.')
    expect((await emailSettingsApi.removeLogo()).logoUrl).toBeNull()
  })
})
