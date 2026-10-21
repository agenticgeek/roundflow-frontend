/** UK postcode outward code, e.g. NE66, SW1A, M1, DN55 — 1-2 letters, 1-2 digits, optional letter/digit. */
const POSTCODE_SECTOR_PATTERN = /^[A-Z]{1,2}\d[A-Z\d]?$/

export function isValidPostcodeSector(sector: string): boolean {
  return POSTCODE_SECTOR_PATTERN.test(sector)
}

/** Area sector: outward code plus an optional first inward digit, e.g. NE66 or NE66 1. */
const AREA_SECTOR_PATTERN = /^[A-Z]{1,2}\d[A-Z\d]?( \d)?$/

/** Uppercases and collapses spacing — `ne66   1` → `NE66 1`. */
export function normalizeAreaSector(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, ' ')
}

/** The space is required before the sector digit — NE661 is ambiguous (NE66 1 vs NE6 61). */
export function isValidAreaSector(sector: string): boolean {
  return AREA_SECTOR_PATTERN.test(normalizeAreaSector(sector))
}

/** Full UK postcode, e.g. NE66 1AA, SW1A 1AA, M1 1AE — outward code + inward code. */
const UK_POSTCODE_PATTERN = /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i

export function isValidUkPostcode(postcode: string): boolean {
  return UK_POSTCODE_PATTERN.test(postcode.trim())
}

/** `ne661ab` / `NE66 1AB` → `NE66 1AB`; anything else is returned uppercased and trimmed. */
export function formatUkPostcode(postcode: string): string {
  const compact = postcode.replace(/\s+/g, '').toUpperCase()
  return compact.length > 3 ? `${compact.slice(0, -3)} ${compact.slice(-3)}` : compact
}

/**
 * The area sector a full postcode belongs to — the most specific match wins, so
 * `NE66 1AB` prefers an area listing `NE66 1` over one listing just `NE66`.
 */
export function matchAreaSector<T extends { sectors: readonly string[] }>(
  postcode: string,
  areas: readonly T[],
): { area: T; sector: string } | null {
  if (!isValidUkPostcode(postcode)) return null
  const formatted = formatUkPostcode(postcode)
  const [outward = '', inward = ''] = formatted.split(' ')
  const fullSector = `${outward} ${inward.charAt(0)}`

  let best: { area: T; sector: string } | null = null
  for (const area of areas) {
    for (const raw of area.sectors) {
      const sector = normalizeAreaSector(raw)
      if (sector === fullSector) return { area, sector }
      if (sector === outward && !best) best = { area, sector }
    }
  }
  return best
}
