/**
 * =============================================================================
 * TEMP DEV AUTH BACKDOOR (email: admin / password: admin)
 *
 * To DISABLE: comment out this ENTIRE file body below, OR set ENABLED to false,
 * and comment the matching blocks marked "DEV AUTH BACKDOOR" in:
 *   - src/pages/Login.tsx
 *   - src/lib/auth.tsx
 *   - src/providers/AppBootstrapProvider.tsx
 * =============================================================================
 */

import type { Session } from '@supabase/supabase-js'
import type { Profile, SetupStatus } from '@/api/types'

/** Flip to false (or comment the wiring blocks) to kill the backdoor. */
export const DEV_AUTH_BYPASS_ENABLED = true

export const DEV_AUTH_BYPASS_EMAIL = 'admin'
export const DEV_AUTH_BYPASS_PASSWORD = 'admin'

const STORAGE_KEY = 'rf-dev-auth-bypass'
const BYPASS_USER_ID = 'dev-auth-bypass-user'

export function isDevAuthBypassCredentials(email: string, password: string): boolean {
  if (!DEV_AUTH_BYPASS_ENABLED) return false
  return email.trim() === DEV_AUTH_BYPASS_EMAIL && password === DEV_AUTH_BYPASS_PASSWORD
}

export function createDevAuthBypassSession(): Session {
  const now = Math.floor(Date.now() / 1000)
  return {
    access_token: 'dev-auth-bypass-token',
    refresh_token: 'dev-auth-bypass-refresh',
    token_type: 'bearer',
    expires_in: 60 * 60 * 24,
    expires_at: now + 60 * 60 * 24,
    user: {
      id: BYPASS_USER_ID,
      aud: 'authenticated',
      role: 'authenticated',
      email: `${DEV_AUTH_BYPASS_EMAIL}@localhost`,
      email_confirmed_at: new Date().toISOString(),
      phone: '',
      confirmed_at: new Date().toISOString(),
      last_sign_in_at: new Date().toISOString(),
      app_metadata: { provider: 'email', providers: ['email'] },
      user_metadata: {
        full_name: 'Dev Admin',
        company_name: 'RoundFlow Dev',
      },
      identities: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_anonymous: false,
    },
  }
}

export function isDevAuthBypassSession(session: Session | null | undefined): boolean {
  if (!DEV_AUTH_BYPASS_ENABLED || !session) return false
  return session.user.id === BYPASS_USER_ID
}

export function persistDevAuthBypass(): void {
  if (!DEV_AUTH_BYPASS_ENABLED) return
  sessionStorage.setItem(STORAGE_KEY, '1')
}

export function clearDevAuthBypass(): void {
  sessionStorage.removeItem(STORAGE_KEY)
}

export function readPersistedDevAuthBypass(): Session | null {
  if (!DEV_AUTH_BYPASS_ENABLED) return null
  if (sessionStorage.getItem(STORAGE_KEY) !== '1') return null
  return createDevAuthBypassSession()
}

/** Mock profile so settings / role gates render as ADMIN. */
export const DEV_AUTH_BYPASS_PROFILE: Profile = {
  id: 'dev-auth-bypass-profile',
  supabaseUserId: BYPASS_USER_ID,
  role: 'ADMIN',
  name: 'Dev Admin',
  createdAt: new Date(0).toISOString(),
  updatedAt: new Date(0).toISOString(),
}

/** Pretend setup is done so protected app routes are reachable. */
export const DEV_AUTH_BYPASS_SETUP_STATUS: SetupStatus = {
  setupCompleted: true,
  allRequiredComplete: true,
  steps: Array.from({ length: 8 }, (_, index) => ({
    step: index + 1,
    complete: true,
    deferred: index + 1 === 5,
  })),
}
