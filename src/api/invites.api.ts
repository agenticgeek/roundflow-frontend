import { api } from '@/api/client'
import type { components } from '@/api/types.gen'

/** CONTRACT-DIFF: `/invites` not fully in generated OpenAPI yet — live per INVITES_HANDOFF. */

export type InviteRole = 'ADMIN' | 'MANAGER' | 'TECHNICIAN'

export type InviteCreateInput = {
  email: string
  role?: InviteRole
  technicianId?: string
}

export type InviteRecord = {
  id: string
  token: string
  tenantId: string
  email: string
  role: string
  technicianId: string | null
  expiresAt: string
  acceptedAt: string | null
  createdAt?: string
}

/** GET /invites row — unaccepted invites, expired ones included (`expired: true`). */
export type PendingInvite = components['schemas']['PendingInvite']

export type InvitePreview = {
  email: string
  role: string
  tenantId: string
  expiresAt: string
}

export type InviteAcceptInput = {
  name: string
}

export type InviteAcceptProfile = {
  id: string
  supabaseUserId: string
  tenantId: string
  role: string
  name: string
  createdAt: string
}

export type InviteAcceptResult = {
  profile: InviteAcceptProfile
}

function jsonRequest(method: 'POST', body?: unknown): RequestInit {
  return {
    method,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  }
}

export const invitesApi = {
  create: (input: InviteCreateInput) =>
    api<InviteRecord>('/invites', jsonRequest('POST', input)),

  list: (signal?: AbortSignal) => api<PendingInvite[]>('/invites', { signal }),

  /** Re-sends an unaccepted invite's email and extends it 7 days (same token). */
  resend: (id: string) =>
    api<InviteRecord>(`/invites/${encodeURIComponent(id)}/resend`, jsonRequest('POST')),

  /** Public — works signed out (the invitee usually has no session yet). */
  getByToken: (token: string, signal?: AbortSignal) =>
    api<InvitePreview>(`/invites/${encodeURIComponent(token)}`, { signal, public: true }),

  accept: (token: string, input: InviteAcceptInput, accessToken?: string) =>
    api<InviteAcceptResult>(`/invites/${encodeURIComponent(token)}/accept`, {
      ...jsonRequest('POST', input),
      ...(accessToken ? { accessToken } : {}),
    }),
}
