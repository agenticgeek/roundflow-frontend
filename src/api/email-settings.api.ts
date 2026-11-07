import { api } from '@/api/client'
import type { components, paths } from '@/api/types.gen'

type Schemas = components['schemas']

export type EmailSettings = Schemas['EmailSettings']
export type EmailDomain = Schemas['EmailDomain']
export type BrandColourCheck = Schemas['BrandColourCheck']
export type Channels = Schemas['Channels']
export type EmailSettingsPatch = NonNullable<paths['/settings/email']['patch']['requestBody']>['content']['application/json']
export type EmailDomainInput = NonNullable<paths['/settings/email/domain']['post']['requestBody']>['content']['application/json']
export type LogoMimeType = NonNullable<paths['/settings/email/logo/upload-url']['post']['requestBody']>['content']['application/json']['mimeType']
export type EmailTestResult = paths['/settings/email/test']['post']['responses'][200]['content']['application/json']

const json = (method: 'POST' | 'PATCH' | 'PUT', body?: unknown): RequestInit => ({
  method,
  ...(body === undefined ? {} : { body: JSON.stringify(body) }),
})

/** Settings > Email and branding. Edits are ADMIN only (a MANAGER gets 403 ADMIN_ONLY). */
export const emailSettingsApi = {
  get: (signal?: AbortSignal) => api<EmailSettings>('/settings/email', { signal }),
  update: (input: EmailSettingsPatch) => api<EmailSettings>('/settings/email', json('PATCH', input)),
  /** Sends a branded test email to the signed-in admin. */
  sendTest: () => api<EmailTestResult>('/settings/email/test', json('POST')),

  checkDomain: (signal?: AbortSignal) => api<EmailDomain>('/settings/email/domain', { signal }),
  startDomain: (input: EmailDomainInput) => api<EmailDomain>('/settings/email/domain', json('POST', input)),
  removeDomain: () => api<EmailDomain>('/settings/email/domain', { method: 'DELETE' }),

  /** upload-url → PUT the bytes to the signed URL → save the path with its alt text. */
  uploadLogo: async (file: File, altText: string) => {
    const target = await api<{ signedUrl: string; token: string; path: string }>(
      '/settings/email/logo/upload-url',
      json('POST', { mimeType: file.type as LogoMimeType }),
    )
    const stored = await fetch(target.signedUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file })
    if (!stored.ok) throw new Error('The logo could not be uploaded. Try again.')
    return api<EmailSettings>('/settings/email/logo', json('PUT', { path: target.path, altText }))
  },
  removeLogo: () => api<EmailSettings>('/settings/email/logo', { method: 'DELETE' }),
}
