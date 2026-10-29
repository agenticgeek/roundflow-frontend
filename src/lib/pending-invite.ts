import { ROUTES } from '@/config/routes'

const INVITE_TOKEN_KEY = 'rf_pending_invite_token'
const INVITE_NAME_KEY = 'rf_pending_invite_name'

/** Stash invite accept payload across Supabase signup / email confirmation. */
export function stashPendingInvite(token: string, name: string) {
  sessionStorage.setItem(INVITE_TOKEN_KEY, token)
  sessionStorage.setItem(INVITE_NAME_KEY, name.trim())
}

export function clearPendingInvite() {
  sessionStorage.removeItem(INVITE_TOKEN_KEY)
  sessionStorage.removeItem(INVITE_NAME_KEY)
}

export function readPendingInvite(): { token: string; name: string } | null {
  const token = sessionStorage.getItem(INVITE_TOKEN_KEY)?.trim()
  if (!token) return null
  return {
    token,
    name: sessionStorage.getItem(INVITE_NAME_KEY)?.trim() ?? '',
  }
}

/**
 * Invite pages accept the invite themselves once the person has set their details. On these
 * paths a signed-in user without a profile must not be auto-provisioned (that would create a
 * new business for an invited technician).
 */
export function isInviteSetupPath(pathname: string = typeof window !== 'undefined' ? window.location.pathname : ''): boolean {
  return pathname === ROUTES.acceptInvite || pathname === ROUTES.technicianSetup
}

/** Resolve invite token from stash, user metadata, or callback query. */
export function resolvePendingInviteToken(sessionMetadata?: Record<string, unknown>): string | null {
  const stashed = readPendingInvite()?.token
  if (stashed) return stashed

  const metaToken = sessionMetadata?.invite_token
  if (typeof metaToken === 'string' && metaToken.trim()) return metaToken.trim()

  if (typeof window !== 'undefined') {
    const fromQuery = new URLSearchParams(window.location.search).get('invite_token')
    if (fromQuery?.trim()) return fromQuery.trim()
  }

  return null
}
