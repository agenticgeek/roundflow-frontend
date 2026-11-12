import type { BusinessProfilePatch } from '@/api/settings.api'

/** Fields of `PATCH /settings/business-profile` that only an ADMIN may send (a MANAGER gets 403 ADMIN_ONLY). */
export const ADMIN_ONLY_PROFILE_KEYS = ['bankDetails', 'vatRegistered', 'vatRegistration', 'vatRate'] as const

/** The patch a user may send: everyone else's own fields only, so saving never trips ADMIN_ONLY. */
export function profilePatchForRole(patch: BusinessProfilePatch, isAdmin: boolean): BusinessProfilePatch {
  if (isAdmin) return patch
  return Object.fromEntries(
    Object.entries(patch).filter(([key]) => !(ADMIN_ONLY_PROFILE_KEYS as readonly string[]).includes(key)),
  ) as BusinessProfilePatch
}
