import { ROUTES } from '@/config/routes'
import { supabase } from '@/lib/supabase'

const EXPIRED_KEY = 'rf-session-expired'
const RETURN_KEY = 'rf-return-to'

/** Screens a signed-out user is meant to be on: never a place to return to, never redirected from. */
const GUEST_PATHS: readonly string[] = [
  ROUTES.login,
  ROUTES.signup,
  ROUTES.authCallback,
  ROUTES.forgotPassword,
  ROUTES.resetPassword,
  ROUTES.acceptInvite,
  ROUTES.technicianSetup,
]

function readStorage(key: string): string | null {
  try {
    return window.sessionStorage.getItem(key)
  } catch {
    return null
  }
}

function writeStorage(key: string, value: string | null) {
  try {
    if (value === null) window.sessionStorage.removeItem(key)
    else window.sessionStorage.setItem(key, value)
  } catch {
    // Storage blocked — the message and the deep link are conveniences, not requirements.
  }
}

/**
 * True for a same-origin, in-app path (`/customers?x=1`) that is safe to redirect to after
 * sign-in. Rejects absolute and protocol-relative URLs, backslash tricks, control characters
 * and the sign-in screens themselves (open-redirect and redirect-loop guard).
 */
export function isSafeInternalPath(value: unknown): value is string {
  if (typeof value !== 'string' || !value.startsWith('/')) return false
  if (value.startsWith('//') || value.startsWith('/\\')) return false
  if ([...value].some((char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127)) return false
  const pathname = value.split(/[?#]/)[0] as string
  return !GUEST_PATHS.includes(pathname)
}

/** A router `Location` (or `window.location`) as `pathname + search + hash`. */
export function locationToPath(location: { pathname: string; search?: string; hash?: string }): string {
  return `${location.pathname}${location.search ?? ''}${location.hash ?? ''}`
}

/**
 * Where to send the user after signing in: the `from` location the route guard put in router
 * state, else the path saved when the session expired. `null` when neither is a safe path.
 */
export function readReturnTo(state: unknown): string | null {
  const from = (state as { from?: { pathname?: unknown; search?: unknown; hash?: unknown } } | null | undefined)?.from
  if (from && typeof from === 'object' && typeof from.pathname === 'string') {
    const path = locationToPath({
      pathname: from.pathname,
      search: typeof from.search === 'string' ? from.search : '',
      hash: typeof from.hash === 'string' ? from.hash : '',
    })
    return isSafeInternalPath(path) ? path : null
  }
  const stored = readStorage(RETURN_KEY)
  return isSafeInternalPath(stored) ? stored : null
}

export function clearReturnTo() {
  writeStorage(RETURN_KEY, null)
}

/** True when the last sign-out was forced by an expired session (Login shows a message). */
export function hasSessionExpired(): boolean {
  return readStorage(EXPIRED_KEY) === '1'
}

export function clearSessionExpired() {
  writeStorage(EXPIRED_KEY, null)
}

let handling: Promise<void> | null = null

/**
 * The API said 401 even after a token refresh and a retry (WEB-01): the session is gone. Signs
 * out, remembers the current page and a "session expired" flag, and sends the user to Login.
 * Idempotent while in flight; a no-op on the sign-in screens themselves.
 */
export function handleSessionExpired(): Promise<void> {
  if (handling) return handling
  if (GUEST_PATHS.includes(window.location.pathname)) return Promise.resolve()
  handling = (async () => {
    const here = locationToPath(window.location)
    if (isSafeInternalPath(here)) writeStorage(RETURN_KEY, here)
    writeStorage(EXPIRED_KEY, '1')
    try {
      await supabase.auth.signOut()
    } catch {
      // Offline or already signed out — the redirect below is what matters.
    }
    window.location.assign(ROUTES.login)
  })()
  return handling
}

/** Test seam: forget the in-flight redirect. */
export function resetSessionExpiryForTests() {
  handling = null
}
