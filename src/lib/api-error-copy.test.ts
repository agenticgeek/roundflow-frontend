import { describe, expect, it } from 'vitest'
import { ApiError, errorMessage } from '@/lib/errors'
import { friendlyApiMessage, isAdminOnly, referenceLine } from '@/lib/api-error-copy'

const withExtra = (status: number, message: string, code?: string, extra: { requestId?: string; retryAfterSeconds?: number } = {}) =>
  new ApiError(status, message, code, undefined, undefined, extra)

describe('isAdminOnly', () => {
  it('is true only for a 403 ADMIN_ONLY ApiError', () => {
    expect(isAdminOnly(new ApiError(403, 'x', 'ADMIN_ONLY'))).toBe(true)
    expect(isAdminOnly(new ApiError(403, 'x', 'ROLE_FORBIDDEN'))).toBe(false)
    expect(isAdminOnly(new Error('x'))).toBe(false)
    expect(isAdminOnly(null)).toBe(false)
  })
})

describe('friendlyApiMessage', () => {
  it('explains ADMIN_ONLY', () => {
    expect(friendlyApiMessage(new ApiError(403, 'Forbidden', 'ADMIN_ONLY'))).toBe('Only an administrator can do this.')
  })

  it('RATE_LIMITED names the wait when Retry-After is known, singular and plural', () => {
    expect(friendlyApiMessage(withExtra(429, 'x', 'RATE_LIMITED', { retryAfterSeconds: 30 }))).toBe('Too many attempts. Try again in 30 seconds.')
    expect(friendlyApiMessage(withExtra(429, 'x', undefined, { retryAfterSeconds: 1 }))).toBe('Too many attempts. Try again in 1 second.')
    expect(friendlyApiMessage(new ApiError(429, 'x'))).toBe('Too many attempts. Wait a moment, then try again.')
    expect(friendlyApiMessage(withExtra(429, 'x', undefined, { retryAfterSeconds: 0 }))).toBe('Too many attempts. Wait a moment, then try again.')
  })

  it('PAYLOAD_TOO_LARGE by status or code', () => {
    expect(friendlyApiMessage(new ApiError(413, 'x'))).toBe('That request is too large. Try sending less at once.')
    expect(friendlyApiMessage(new ApiError(400, 'x', 'PAYLOAD_TOO_LARGE'))).toBe('That request is too large. Try sending less at once.')
  })

  it('leaves everything else to the server message', () => {
    expect(friendlyApiMessage(new ApiError(409, 'Already paid'))).toBeNull()
  })
})

describe('referenceLine', () => {
  it('is "Reference: <id>" for a server error that has a request id', () => {
    expect(referenceLine(withExtra(500, 'x', undefined, { requestId: 'req_1' }))).toBe('Reference: req_1')
    expect(referenceLine(withExtra(503, 'x', undefined, { requestId: 'req_2' }))).toBe('Reference: req_2')
  })

  it('is null without an id, for client errors and for non-API errors', () => {
    expect(referenceLine(new ApiError(500, 'x'))).toBeNull()
    expect(referenceLine(withExtra(400, 'x', undefined, { requestId: 'req_3' }))).toBeNull()
    expect(referenceLine(new Error('x'))).toBeNull()
  })
})

describe('errorMessage', () => {
  it('uses the friendly text, appends the reference to server errors, else the plain message', () => {
    expect(errorMessage(new ApiError(403, 'raw', 'ADMIN_ONLY'))).toBe('Only an administrator can do this.')
    expect(errorMessage(withExtra(500, 'Boom', undefined, { requestId: 'req_9' }))).toBe('Boom Reference: req_9')
    expect(errorMessage(new ApiError(409, 'Already paid'))).toBe('Already paid')
    expect(errorMessage(new Error('Plain'))).toBe('Plain')
    expect(errorMessage('weird')).toBe('Something went wrong. Please try again.')
  })
})
