import { api } from '@/api/client'
import type { Profile } from '@/api/types'

export type SignupInput = {
  name: string
  companyName?: string
}

export type SignupResponse = {
  profile: Profile & { tenantId: string }
  tenantId: string
}

/** Free-form per-user preferences bag (CONTRACT-DIFF: not in generated OpenAPI). */
export type UserPreferences = Record<string, unknown>
export type UserPreferencesResponse = { preferences: UserPreferences }

export const authApi = {
  getMe: (signal?: AbortSignal, accessToken?: string) =>
    api<Profile>('/auth/me', { signal, accessToken }),
  // CONTRACT-DIFF: /auth/signup is used for post-Supabase profile provisioning
  // but is not yet present in the generated OpenAPI types.
  signup: (input: SignupInput, accessToken?: string) =>
    api<SignupResponse>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(input),
      accessToken,
    }),

  getPreferences: (signal?: AbortSignal) =>
    api<UserPreferencesResponse>('/auth/me/preferences', { signal }),
  // Shallow-merges the given keys into the stored bag (100KB cap server-side).
  updatePreferences: (patch: UserPreferences) =>
    api<UserPreferencesResponse>('/auth/me/preferences', {
      method: 'PATCH',
      body: JSON.stringify(patch),
    }),
}
