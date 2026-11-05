import { complaintsContent } from '@/content/complaints'

export type ResolvedBy = { id: string; name?: string | null } | null | undefined

/** Who resolved a complaint — `resolvedBy` is `{ id, name }` (GAP-029); a nameless profile shows as "Admin". */
export function resolvedByLabel(resolvedBy: ResolvedBy): string {
  if (!resolvedBy) return '—'
  return resolvedBy.name?.trim() || complaintsContent.resolvedByFallback
}

/** Resolution outcome (GAP-025): an upheld complaint counts as a strike against the technician. */
export function upheldLabel(upheld: boolean | null | undefined): string {
  if (upheld === true) return complaintsContent.upheld.yes
  if (upheld === false) return complaintsContent.upheld.no
  return '—'
}

/**
 * "Technician involved" lists every technician, pending invites included (the API accepts them,
 * GAP-029 part 2). Only an empty team gets a hint.
 */
export function technicianListHint(technicians: readonly unknown[] | undefined): string | null {
  if (!technicians || technicians.length > 0) return null
  return complaintsContent.noTechnicians
}

/** "Sam", or "Sam (invite pending)" for a technician who hasn't accepted yet. */
export function technicianOptionLabel(technician: { name: string | null; appStatus?: string | null }): string {
  const name = technician.name ?? complaintsContent.unnamedTechnician
  return technician.appStatus === 'PENDING_INVITE' ? `${name} ${complaintsContent.invitePending}` : name
}
