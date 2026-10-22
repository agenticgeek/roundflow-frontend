/**
 * Technician roles the backend accepts on POST/PATCH /technicians and /settings/technicians
 * (audit follow-up 2026-10-22) — anything else is a 400. Older rows may still hold free text,
 * so labels fall back to the stored value.
 */
export const TECHNICIAN_ROLES = ['TRAINEE', 'STANDARD', 'SENIOR', 'LEAD'] as const
export type TechnicianRole = (typeof TECHNICIAN_ROLES)[number]

export const TECHNICIAN_ROLE_OPTIONS: { value: TechnicianRole; label: string }[] = [
  { value: 'STANDARD', label: 'Technician' },
  { value: 'SENIOR', label: 'Senior technician' },
  { value: 'LEAD', label: 'Lead technician' },
  { value: 'TRAINEE', label: 'Trainee' },
]

/** Free-text roles saved before validation existed, mapped onto the new values. */
const LEGACY_ROLE_VALUES: Record<string, TechnicianRole> = {
  technician: 'STANDARD',
  standard: 'STANDARD',
  senior: 'SENIOR',
  'senior technician': 'SENIOR',
  lead: 'LEAD',
  'lead technician': 'LEAD',
  'lead-technician': 'LEAD',
  trainee: 'TRAINEE',
  'trainee technician': 'TRAINEE',
}

/** A stored role (new enum or legacy text) as one of the accepted values, or null. */
export function toTechnicianRole(role: string | null | undefined): TechnicianRole | null {
  if (!role) return null
  const trimmed = role.trim()
  if ((TECHNICIAN_ROLES as readonly string[]).includes(trimmed)) return trimmed as TechnicianRole
  return LEGACY_ROLE_VALUES[trimmed.toLowerCase()] ?? null
}

export function technicianRoleLabel(role: string | null | undefined): string {
  const value = toTechnicianRole(role)
  if (value) return TECHNICIAN_ROLE_OPTIONS.find((option) => option.value === value)!.label
  return role?.trim() || 'Technician'
}
