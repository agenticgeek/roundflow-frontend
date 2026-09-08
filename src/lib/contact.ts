const PHONE_PATTERN = /^[+\d][\d\s()-]{6,19}$/
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Loose enough for international formats; just guards against garbage input. */
export function isValidPhone(value: string): boolean {
  return PHONE_PATTERN.test(value.trim())
}

export function isValidEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value.trim())
}
