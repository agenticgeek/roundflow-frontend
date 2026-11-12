import { afterEach, describe, expect, it, vi } from 'vitest'
import { idempotencyKeyFor, newIdempotencyKey } from '@/lib/idempotency'

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

afterEach(() => vi.unstubAllGlobals())

describe('newIdempotencyKey', () => {
  it('returns a UUID that is different each time', () => {
    const a = newIdempotencyKey()
    expect(a).toMatch(UUID_V4)
    expect(newIdempotencyKey()).not.toBe(a)
  })

  it('still works where crypto.randomUUID is missing (insecure http context)', () => {
    vi.stubGlobal('crypto', { getRandomValues: (bytes: Uint8Array) => bytes.fill(7) })
    expect(newIdempotencyKey()).toMatch(UUID_V4)
  })
})

describe('idempotencyKeyFor', () => {
  it('gives one key per user action: the same input object reuses it on retry', () => {
    const input = { visitId: 'v1' }
    expect(idempotencyKeyFor(input)).toBe(idempotencyKeyFor(input))
  })

  it('gives a new key to a new action, even with identical content', () => {
    expect(idempotencyKeyFor({ a: 1 })).not.toBe(idempotencyKeyFor({ a: 1 }))
  })

  it('gives a fresh key when there is no object to remember (null, string, undefined)', () => {
    expect(idempotencyKeyFor(null)).not.toBe(idempotencyKeyFor(null))
    expect(idempotencyKeyFor('x')).not.toBe(idempotencyKeyFor('x'))
    expect(idempotencyKeyFor(undefined)).toMatch(UUID_V4)
  })
})
