const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_CHARS_PATTERN = /^\+?[\d\s()-]+$/

/** E.164 caps a full international number at 15 digits; UK numbers are 10–11. */
export const PHONE_MIN_DIGITS = 7
export const PHONE_MAX_DIGITS = 15
/** Digits plus room for a leading "+" and spacing, e.g. "+44 (0)7123 456 789". */
export const PHONE_MAX_LENGTH = 20

/** Drops anything that can't appear in a phone number and caps the length while typing. */
export function sanitizePhoneInput(value: string): string {
  const cleaned = value.replace(/[^\d\s()+-]/g, '').replace(/(?!^)\+/g, '')
  let digits = 0
  let result = ''
  for (const char of cleaned) {
    if (/\d/.test(char)) {
      if (digits >= PHONE_MAX_DIGITS) break
      digits += 1
    }
    result += char
  }
  return result.slice(0, PHONE_MAX_LENGTH)
}

export function isValidPhone(value: string): boolean {
  const trimmed = value.trim()
  if (!PHONE_CHARS_PATTERN.test(trimmed)) return false
  const digits = trimmed.replace(/\D/g, '').length
  return digits >= PHONE_MIN_DIGITS && digits <= PHONE_MAX_DIGITS
}

export function isValidEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value.trim())
}
