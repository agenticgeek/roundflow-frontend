import { describe, expect, it } from 'vitest'
import { describeFloError, errorFromEvent, errorFromThrown } from '@/features/flo/lib/errors'
import { ApiError } from '@/lib/errors'
import { NetworkError } from '@/lib/network-error'

describe('Flo errors', () => {
  it('uses our copy for every known code', () => {
    expect(describeFloError('FLO_DAILY_LIMIT')).toEqual({
      code: 'FLO_DAILY_LIMIT',
      message: 'Flo has reached today’s limit. It resets at midnight.',
      retryable: false,
    })
    expect(describeFloError('FLO_TIMEOUT').retryable).toBe(true)
    expect(describeFloError('FLO_NO_ANSWER').message).toContain('rephrasing')
  })

  it('keeps the server message for an unknown code, with a safe fallback', () => {
    expect(describeFloError('WEIRD', 'Server says no', false)).toEqual({ code: 'WEIRD', message: 'Server says no', retryable: false })
    expect(describeFloError(undefined)).toMatchObject({ code: 'UNKNOWN', retryable: true })
    expect(describeFloError('WEIRD')).toMatchObject({ code: 'WEIRD', message: 'Something went wrong. Try again.' })
    expect(errorFromEvent({ code: 'FLO_PROVIDER_ERROR', message: 'raw', retryable: false })).toMatchObject({
      message: expect.stringContaining('AI service'),
      retryable: true,
    })
  })

  it('maps thrown errors', () => {
    expect(errorFromThrown(new ApiError(429, 'x', 'FLO_DAILY_LIMIT'))).toMatchObject({ code: 'FLO_DAILY_LIMIT' })
    expect(errorFromThrown(new ApiError(429, 'x', 'RATE_LIMITED'))).toEqual({
      code: 'RATE_LIMITED',
      message: 'Too many attempts. Wait a moment, then try again.',
      retryable: true,
    })
    expect(errorFromThrown(new ApiError(429, 'x'))).toMatchObject({ code: 'RATE_LIMITED' })
    expect(errorFromThrown(new ApiError(502, 'Bad gateway'))).toEqual({ code: 'UNKNOWN', message: 'Bad gateway', retryable: true })
    expect(errorFromThrown(new ApiError(400, 'Nope'))).toMatchObject({ message: 'Nope', retryable: false })
    expect(errorFromThrown(new NetworkError())).toMatchObject({ code: 'NETWORK', retryable: true })
    expect(errorFromThrown(new Error('boom'))).toMatchObject({ code: 'UNKNOWN' })
  })
})
