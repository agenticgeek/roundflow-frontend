/** `tel:` link for a phone number as typed ("07123 456 789" → `tel:07123456789`); `null` when there are no digits. */
export function telHref(phone: string | null | undefined): string | null {
  const trimmed = phone?.trim() ?? ''
  const digits = trimmed.replace(/\D/g, '')
  if (!digits) return null
  return `tel:${trimmed.startsWith('+') ? '+' : ''}${digits}`
}
