import { createClient } from '@supabase/supabase-js'

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.replace(
  /\/$/,
  '',
)
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env',
  )
}

const REMEMBER_KEY = 'rf-remember-session'

/** "Remember me": stay signed in across browser restarts (default), or only for this tab session. */
export function setRememberSession(remember: boolean) {
  try {
    window.localStorage.setItem(REMEMBER_KEY, remember ? '1' : '0')
  } catch {
    // Storage blocked — the session simply falls back to the default store.
  }
}

function sessionStore(): Storage {
  try {
    return window.localStorage.getItem(REMEMBER_KEY) === '0' ? window.sessionStorage : window.localStorage
  } catch {
    return window.localStorage
  }
}

/** Reads from either store, writes to the one chosen at sign-in, and clears the other. */
export const authStorage = {
  getItem: (key: string) => window.localStorage.getItem(key) ?? window.sessionStorage.getItem(key),
  setItem: (key: string, value: string) => {
    const target = sessionStore()
    const other = target === window.localStorage ? window.sessionStorage : window.localStorage
    other.removeItem(key)
    target.setItem(key, value)
  },
  removeItem: (key: string) => {
    window.localStorage.removeItem(key)
    window.sessionStorage.removeItem(key)
  },
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: authStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    flowType: 'pkce',
  },
})

/**
 * In-memory access token, kept in sync with the session. `getSession()` acquires
 * the navigator lock (`lock:sb-<ref>-auth-token`) on every call, so reading it per
 * request serializes concurrent requests and stalls them behind any in-flight token
 * refresh. `autoRefreshToken` rotates the token well before expiry and fires
 * `TOKEN_REFRESHED`, so this cache stays valid; `api()` reads it synchronously and
 * only falls back to `getSession()` on a cold start or after a 401.
 */
let cachedAccessToken: string | null = null

void supabase.auth.getSession().then(({ data }) => {
  cachedAccessToken = data.session?.access_token ?? cachedAccessToken
})

supabase.auth.onAuthStateChange((_event, session) => {
  cachedAccessToken = session?.access_token ?? null
})

export function getCachedAccessToken(): string | null {
  return cachedAccessToken
}

let refreshInFlight: Promise<string | null> | null = null

/**
 * Forces a session read (refreshing if near expiry) and updates the cache.
 * Single-flighted: concurrent callers (e.g. several requests getting 401 at once,
 * or during an auth-host outage) share one attempt instead of fanning out refreshes.
 */
export async function refreshAccessToken(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight
  refreshInFlight = supabase.auth
    .getSession()
    .then(({ data }) => {
      cachedAccessToken = data.session?.access_token ?? null
      return cachedAccessToken
    })
    .finally(() => {
      refreshInFlight = null
    })
  return refreshInFlight
}
