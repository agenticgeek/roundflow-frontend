import { api } from '@/api/client'

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

  /** Public — no auth required (Bearer may be empty). */
  getByToken: (token: string, signal?: AbortSignal) =>
    api<InvitePreview>(`/invites/${encodeURIComponent(token)}`, { signal }),

  accept: (token: string, input: InviteAcceptInput, accessToken?: string) =>
    api<InviteAcceptResult>(`/invites/${encodeURIComponent(token)}/accept`, {
      ...jsonRequest('POST', input),
      ...(accessToken ? { accessToken } : {}),
    }),
}
