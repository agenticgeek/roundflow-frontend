/** UK postcode outward code, e.g. NE66, SW1A, M1, DN55 — 1-2 letters, 1-2 digits, optional letter/digit. */
const POSTCODE_SECTOR_PATTERN = /^[A-Z]{1,2}\d[A-Z\d]?$/

export function isValidPostcodeSector(sector: string): boolean {
  return POSTCODE_SECTOR_PATTERN.test(sector)
}

/** Full UK postcode, e.g. NE66 1AA, SW1A 1AA, M1 1AE — outward code + inward code. */
const UK_POSTCODE_PATTERN = /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i

export function isValidUkPostcode(postcode: string): boolean {
  return UK_POSTCODE_PATTERN.test(postcode.trim())
}
