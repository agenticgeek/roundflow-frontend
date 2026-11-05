import { afterEach, describe, expect, it, vi } from 'vitest'

/** Loads the real client (the global setup mocks it) with the Supabase env stubbed. */
async function loadSupabase() {
  vi.resetModules()
  vi.doUnmock('@/lib/supabase')
  vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co/')
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon')
  return await vi.importActual<typeof import('@/lib/supabase')>('@/lib/supabase')
}

afterEach(() => {
  vi.unstubAllEnvs()
  window.localStorage.clear()
  window.sessionStorage.clear()
})

describe('Remember me session storage', () => {
  it('stores the session in localStorage by default and in sessionStorage when not remembered', async () => {
    const { setRememberSession, authStorage } = await loadSupabase()

    authStorage.setItem('k', 'remembered')
    expect(window.localStorage.getItem('k')).toBe('remembered')

    setRememberSession(false)
    authStorage.setItem('k', 'tab-only')
    expect(window.sessionStorage.getItem('k')).toBe('tab-only')
    expect(window.localStorage.getItem('k')).toBeNull()
    expect(authStorage.getItem('k')).toBe('tab-only')

    setRememberSession(true)
    authStorage.setItem('k', 'again')
    expect(window.localStorage.getItem('k')).toBe('again')
    expect(window.sessionStorage.getItem('k')).toBeNull()

    authStorage.removeItem('k')
    expect(authStorage.getItem('k')).toBeNull()
  })

  it('throws a clear error when the env is missing', async () => {
    vi.resetModules()
    vi.stubEnv('VITE_SUPABASE_URL', '')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '')
    await expect(vi.importActual('@/lib/supabase')).rejects.toThrow(/Missing Supabase environment variables/)
  })
})
