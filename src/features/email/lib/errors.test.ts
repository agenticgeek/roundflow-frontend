import { describe, expect, it } from 'vitest'
import { ApiError } from '@/lib/errors'
import { domainErrorMessage, emailSettingsErrorMessage } from '@/features/email/lib/errors'

const failure = (code: string, body?: unknown) => new ApiError(400, 'Server words', code, undefined, body)

describe('emailSettingsErrorMessage', () => {
  it('uses plain copy for the known 400 codes, and the CHANNEL_UNAVAILABLE reason for a test email', () => {
    expect(emailSettingsErrorMessage(failure('INVALID_BRAND_COLOUR'))).toBe('Enter the colour as #RRGGBB, for example #00758C.')
    expect(emailSettingsErrorMessage(failure('INVALID_EMAIL_SENDER_NAME'))).toMatch(/70 characters/)
    expect(emailSettingsErrorMessage(failure('CHANNEL_UNAVAILABLE', { reason: 'EMAIL_PAUSED' }))).toBe('Email sending is paused')
    expect(emailSettingsErrorMessage(failure('CHANNEL_UNAVAILABLE'))).toBe('Server words')
  })

  it('falls back to the shared message for anything else', () => {
    expect(emailSettingsErrorMessage(new ApiError(403, 'x', 'ADMIN_ONLY'))).toBe('Only an administrator can do this.')
    expect(emailSettingsErrorMessage(failure('OTHER'))).toBe('Server words')
    expect(emailSettingsErrorMessage(new Error('boom'))).toBe('boom')
  })
})

describe('domainErrorMessage', () => {
  it('explains a refused free-mail domain and the other domain codes', () => {
    expect(domainErrorMessage(failure('FREE_MAIL_DOMAIN'))).toMatch(/shared RoundFlow address with your business name/)
    expect(domainErrorMessage(failure('EMAIL_DOMAIN_IN_USE'))).toMatch(/Another business/)
    expect(domainErrorMessage(new ApiError(502, 'x', 'EMAIL_DOMAIN_FAILED'))).toMatch(/Try again in a moment/)
  })

  it('falls back to the settings messages', () => {
    expect(domainErrorMessage(failure('INVALID_BRAND_COLOUR'))).toMatch(/#RRGGBB/)
    expect(domainErrorMessage(failure('CHANNEL_UNAVAILABLE', { reason: 'EMAIL_NOT_CONFIGURED' }))).toBe('Email is not set up for this account yet')
    expect(domainErrorMessage(new Error('boom'))).toBe('boom')
  })
})
