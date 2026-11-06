import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { supabase } from '@/lib/supabase'
import {
  clearReturnTo,
  clearSessionExpired,
  handleSessionExpired,
  hasSessionExpired,
  isSafeInternalPath,
  locationToPath,
  readReturnTo,
  resetSessionExpiryForTests,
} from '@/lib/session-expiry'

const assign = vi.fn()

function stubLocation(pathname: string, search = '', hash = '') {
  vi.stubGlobal('location', { pathname, search, hash, origin: 'http://localhost:3000', assign })
}

beforeEach(() => {
  assign.mockReset()
  resetSessionExpiryForTests()
  sessionStorage.clear()
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('isSafeInternalPath', () => {
  it('accepts same-origin paths only', () => {
    expect(isSafeInternalPath('/round-planner?x=1#top')).toBe(true)
    expect(isSafeInternalPath('/')).toBe(true)
    expect(isSafeInternalPath('//evil.example')).toBe(false)
    expect(isSafeInternalPath('/\\evil.example')).toBe(false)
    expect(isSafeInternalPath('https://evil.example/x')).toBe(false)
    expect(isSafeInternalPath('javascript:alert(1)')).toBe(false)
    expect(isSafeInternalPath('relative/path')).toBe(false)
    expect(isSafeInternalPath('/ok\nbad')).toBe(false)
    expect(isSafeInternalPath(42)).toBe(false)
    expect(isSafeInternalPath(null)).toBe(false)
  })

  it('refuses the sign-in screens themselves', () => {
    expect(isSafeInternalPath('/login')).toBe(false)
    expect(isSafeInternalPath('/signup?x=1')).toBe(false)
    expect(isSafeInternalPath('/auth/callback')).toBe(false)
  })
})

describe('locationToPath / readReturnTo', () => {
  it('joins a router location', () => {
    expect(locationToPath({ pathname: '/a', search: '?b=1', hash: '#c' })).toBe('/a?b=1#c')
    expect(locationToPath({ pathname: '/a' })).toBe('/a')
  })

  it('prefers router state, falls back to storage, and ignores unsafe values', () => {
    expect(readReturnTo({ from: { pathname: '/customers', search: '?q=a', hash: '#x' } })).toBe('/customers?q=a#x')
    expect(readReturnTo({ from: { pathname: '/customers' } })).toBe('/customers')
    expect(readReturnTo({ from: { pathname: '//evil.example' } })).toBeNull()
    expect(readReturnTo(null)).toBeNull()
    sessionStorage.setItem('rf-return-to', '/invoices')
    expect(readReturnTo(null)).toBe('/invoices')
    expect(readReturnTo({ from: 'nope' })).toBe('/invoices')
    sessionStorage.setItem('rf-return-to', 'https://evil.example')
    expect(readReturnTo(undefined)).toBeNull()
    sessionStorage.setItem('rf-return-to', '/invoices')
    clearReturnTo()
    expect(readReturnTo(null)).toBeNull()
  })

  it('survives blocked storage', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    expect(readReturnTo(null)).toBeNull()
    expect(hasSessionExpired()).toBe(false)
    expect(() => clearReturnTo()).not.toThrow()
    expect(() => clearSessionExpired()).not.toThrow()
  })
})

describe('handleSessionExpired', () => {
  it('signs out, remembers where the user was, flags the message and redirects once', async () => {
    stubLocation('/invoices', '?page=2')
    const signOut = vi.spyOn(supabase.auth, 'signOut')

    await Promise.all([handleSessionExpired(), handleSessionExpired()])

    expect(signOut).toHaveBeenCalledTimes(1)
    expect(hasSessionExpired()).toBe(true)
    expect(readReturnTo(null)).toBe('/invoices?page=2')
    expect(assign).toHaveBeenCalledTimes(1)
    expect(assign).toHaveBeenCalledWith('/login')

    clearSessionExpired()
    expect(hasSessionExpired()).toBe(false)
  })

  it('still redirects when sign-out fails', async () => {
    stubLocation('/customers')
    vi.spyOn(supabase.auth, 'signOut').mockRejectedValue(new Error('offline'))
    await handleSessionExpired()
    expect(assign).toHaveBeenCalledWith('/login')
  })

  it('does nothing on a sign-in screen (no redirect loop)', async () => {
    stubLocation('/login')
    const signOut = vi.spyOn(supabase.auth, 'signOut')
    await handleSessionExpired()
    expect(signOut).not.toHaveBeenCalled()
    expect(assign).not.toHaveBeenCalled()
    expect(hasSessionExpired()).toBe(false)
  })

  it('does not remember an unsafe current path', async () => {
    stubLocation('//odd')
    await handleSessionExpired()
    expect(readReturnTo(null)).toBeNull()
    expect(assign).toHaveBeenCalledWith('/login')
  })
})
