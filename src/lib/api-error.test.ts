import { describe, expect, it } from 'vitest'
import { apiErrorFromResponse, normaliseFields, parseRetryAfter } from '@/lib/api-error'

function response(status: number, headers: Record<string, string> = {}) {
  return new Response(null, { status, headers })
}

describe('parseRetryAfter', () => {
  it('reads whole seconds and ignores everything else', () => {
    expect(parseRetryAfter('30')).toBe(30)
    expect(parseRetryAfter(' 0 ')).toBe(0)
    expect(parseRetryAfter(null)).toBeUndefined()
    expect(parseRetryAfter('')).toBeUndefined()
    expect(parseRetryAfter('Wed, 21 Oct 2026 07:28:00 GMT')).toBeUndefined()
    expect(parseRetryAfter('-5')).toBeUndefined()
    expect(parseRetryAfter('1.5')).toBeUndefined()
  })
})

describe('normaliseFields', () => {
  it('keeps the old { name: message } shape', () => {
    expect(normaliseFields({ name: 'bad' })).toEqual({ name: 'bad' })
  })

  it('turns the new [{ path, code, message }] list into { path: message }', () => {
    expect(
      normaliseFields([
        { path: 'email', code: 'INVALID_EMAIL', message: 'Not an email' },
        { path: 'phone', code: 'X', message: 'Too short' },
        { code: 'no-path', message: 'ignored' },
        { path: 'no-message' },
        'junk',
        null,
      ]),
    ).toEqual({ email: 'Not an email', phone: 'Too short' })
  })

  it('returns undefined for anything else', () => {
    expect(normaliseFields(undefined)).toBeUndefined()
    expect(normaliseFields(null)).toBeUndefined()
    expect(normaliseFields('x')).toBeUndefined()
    expect(normaliseFields([])).toBeUndefined()
  })
})

describe('apiErrorFromResponse', () => {
  it('builds the message from error, then message, then a default', () => {
    expect(apiErrorFromResponse(response(400), { error: 'Nope', code: 'X' })).toMatchObject({ status: 400, message: 'Nope', code: 'X' })
    expect(apiErrorFromResponse(response(500), { message: 'From message' }).message).toBe('From message')
    expect(apiErrorFromResponse(response(500), {}).message).toBe('Request failed')
  })

  it('carries the request id (header first, then body) and Retry-After', () => {
    const fromHeader = apiErrorFromResponse(response(429, { 'X-Request-Id': 'req-h', 'Retry-After': '12' }), {
      error: 'Slow down',
      requestId: 'req-b',
    })
    expect(fromHeader).toMatchObject({ requestId: 'req-h', retryAfterSeconds: 12 })
    expect(apiErrorFromResponse(response(500), { error: 'x', requestId: 'req-b' }).requestId).toBe('req-b')
    const none = apiErrorFromResponse(response(500), { error: 'x', requestId: 7 })
    expect(none.requestId).toBeUndefined()
    expect(none.retryAfterSeconds).toBeUndefined()
  })

  it('normalises fields and keeps the parsed body', () => {
    const body = { error: 'Invalid', fields: [{ path: 'email', code: 'C', message: 'Bad' }] }
    const error = apiErrorFromResponse(response(400), body)
    expect(error.fields).toEqual({ email: 'Bad' })
    expect(error.body).toBe(body)
  })
})
