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
}
