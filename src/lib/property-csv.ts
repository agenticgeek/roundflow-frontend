import type { PropertyDraft } from '@/types/setup-wizard'
import { isValidEmail, isValidPhone, sanitizePhoneInput } from '@/lib/contact'
import { isValidUkPostcode } from '@/lib/postcode'

/**
 * Parses a pasted customer/property export (the common CRM column layout — ID,
 * name, phones, email, billing + service address) into PropertyDraft rows.
 *
 * Only address/contact columns exist in the export; `round` and `pricePerVisit`
 * are not in the file, so the import UI collects them once per batch and fills
 * them in before saving. Accepts tab-separated (spreadsheet paste) or comma CSV.
 */

export interface ParsedProperty {
  rowNumber: number
  /** round + pricePerVisit are left blank here; the batch defaults fill them. */
  draft: PropertyDraft
}

export interface SkippedRow {
  rowNumber: number
  label: string
  reason: string
}

export interface PropertyCsvResult {
  properties: ParsedProperty[]
  skipped: SkippedRow[]
  /** False when the header row has none of the columns we know how to map. */
  recognized: boolean
}

const HEADER_ALIASES: Record<string, readonly string[]> = {
  isCompany: ['is company'],
  companyName: ['company name', 'company'],
  firstName: ['first name', 'firstname', 'first'],
  lastName: ['last name', 'lastname', 'surname', 'last'],
  mobile: ['mobile phone', 'mobile', 'mobile number', 'cell'],
  homePhone: ['home phone', 'landline', 'telephone'],
  workPhone: ['work phone', 'office phone'],
  email: ['email', 'email address', 'e-mail'],
  serviceStreet1: ['service street 1', 'service address 1', 'service address'],
  serviceStreet2: ['service street 2', 'service address 2'],
  serviceCity: ['service city', 'service town'],
  serviceCounty: ['service county'],
  servicePostcode: ['service postcode', 'service post code', 'service postal code'],
  billingStreet1: ['billing street 1', 'billing address 1', 'billing address'],
  billingStreet2: ['billing street 2', 'billing address 2'],
  billingCity: ['billing city', 'billing town'],
  billingCounty: ['billing county'],
  billingPostcode: ['billing postcode', 'billing post code', 'billing postal code'],
}

function normalizeHeader(value: string): string {
  return value.toLowerCase().replace(/[?_]/g, ' ').replace(/\s+/g, ' ').trim()
}

/** Quote-aware split for one line — handles `"a, b"` in comma CSV; tabs rarely quoted. */
function splitLine(line: string, delimiter: string): string[] {
  const cells: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i += 1
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === delimiter && !inQuotes) {
      cells.push(current)
      current = ''
    } else {
      current += char
    }
  }
  cells.push(current)
  return cells.map((cell) => cell.trim())
}

function cell(row: string[], index: number | undefined): string {
  if (index === undefined) return ''
  const value = row[index]
  return value ? value.trim() : ''
}

function isTruthy(value: string): boolean {
  return /^(y|yes|true|1)$/i.test(value.trim())
}

/** Join address parts, dropping blanks; prefers service address, falls back to billing. */
function buildAddress(
  get: (field: string) => string,
): { fullAddress: string; postcode: string } {
  const service = [
    get('serviceStreet1'),
    get('serviceStreet2'),
    get('serviceCity'),
    get('serviceCounty'),
  ]
  const billing = [
    get('billingStreet1'),
    get('billingStreet2'),
    get('billingCity'),
    get('billingCounty'),
  ]
  const useService = service.some(Boolean) || !billing.some(Boolean)
  const parts = (useService ? service : billing).filter(Boolean)
  const postcode =
    (useService ? get('servicePostcode') : get('billingPostcode')) ||
    get('servicePostcode') ||
    get('billingPostcode')
  return { fullAddress: parts.join(', '), postcode }
}

/** Splits pasted text into a 2D row array (tab- or comma-delimited, quote-aware). */
export function splitDelimitedText(text: string): string[][] {
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0)
  if (lines.length === 0) return []
  const delimiter = lines[0]!.includes('\t') ? '\t' : ','
  return lines.map((line) => splitLine(line, delimiter))
}

export function parsePropertyCsv(text: string, draftDefaults: PropertyDraft): PropertyCsvResult {
  return parsePropertyRows(splitDelimitedText(text), draftDefaults)
}

/** Reads the first sheet of an .xlsx file and maps it. Loads the parser lazily. */
export async function parsePropertyXlsx(
  file: Blob,
  draftDefaults: PropertyDraft,
): Promise<PropertyCsvResult> {
  const { default: readXlsxFile } = await import('read-excel-file/browser')
  type Cell = string | number | boolean | Date | null
  // Across versions the default export returns either the first sheet's rows
  // (Cell[][]) or an array of sheets ({ sheet, data }[]). Normalise to a grid.
  const raw = (await readXlsxFile(file)) as unknown as Cell[][] | { data: Cell[][] }[]
  const rows: Cell[][] = Array.isArray(raw[0])
    ? (raw as Cell[][])
    : ((raw as { data: Cell[][] }[])[0]?.data ?? [])
  const grid = rows.map((row) => row.map((value) => (value == null ? '' : String(value).trim())))
  return parsePropertyRows(grid, draftDefaults)
}

/**
 * Core mapper — works on an already-tokenised grid, so both pasted CSV/TSV and
 * a parsed .xlsx sheet (read-excel-file) share one validation/mapping path.
 * Row 0 is the header.
 */
export function parsePropertyRows(rows: string[][], draftDefaults: PropertyDraft): PropertyCsvResult {
  if (rows.length < 2) {
    return { properties: [], skipped: [], recognized: rows.length > 0 }
  }

  const headers = rows[0]!.map(normalizeHeader)

  // Map each known field to its column index via the first matching alias.
  const columnOf: Record<string, number | undefined> = {}
  for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
    columnOf[field] = headers.findIndex((header) => aliases.includes(header))
    if (columnOf[field] === -1) columnOf[field] = undefined
  }

  const recognized =
    columnOf.firstName !== undefined ||
    columnOf.lastName !== undefined ||
    columnOf.companyName !== undefined ||
    columnOf.serviceStreet1 !== undefined ||
    columnOf.billingStreet1 !== undefined
  if (!recognized) return { properties: [], skipped: [], recognized: false }

  const properties: ParsedProperty[] = []
  const skipped: SkippedRow[] = []
  const seen = new Set<string>()

  for (let i = 1; i < rows.length; i += 1) {
    const rowNumber = i + 1
    const row = rows[i]!
    const get = (field: string) => cell(row, columnOf[field])

    const company = get('companyName')
    const fullName = [get('firstName'), get('lastName')].filter(Boolean).join(' ').trim()
    const customerName = (isTruthy(get('isCompany')) && company ? company : fullName) || company
    const { fullAddress, postcode } = buildAddress(get)
    const label = customerName || fullAddress || `Row ${rowNumber}`

    if (!customerName) {
      skipped.push({ rowNumber, label, reason: 'No customer or company name' })
      continue
    }
    if (!fullAddress) {
      skipped.push({ rowNumber, label, reason: 'No address' })
      continue
    }
    if (!postcode) {
      skipped.push({ rowNumber, label, reason: 'No postcode' })
      continue
    }
    if (!isValidUkPostcode(postcode)) {
      skipped.push({ rowNumber, label, reason: `Invalid postcode "${postcode}"` })
      continue
    }

    const dedupeKey = `${customerName.toLowerCase()}|${postcode.toLowerCase()}|${fullAddress.toLowerCase()}`
    if (seen.has(dedupeKey)) {
      skipped.push({ rowNumber, label, reason: 'Duplicate of another pasted row' })
      continue
    }
    seen.add(dedupeKey)

    // GAP-009: a mobile is required, as on the single-add form — a row without a valid one is
    // listed as an error in the preview and not imported. Landline/email stay optional: an
    // invalid one is just dropped.
    const mobileRaw = get('mobile')
    const mobile = sanitizePhoneInput(mobileRaw)
    if (!mobileRaw) {
      skipped.push({ rowNumber, label, reason: 'No mobile number' })
      continue
    }
    if (!isValidPhone(mobile)) {
      skipped.push({ rowNumber, label, reason: `Invalid mobile number "${mobileRaw}"` })
      continue
    }
    const landlineRaw = sanitizePhoneInput(get('homePhone') || get('workPhone'))
    const email = get('email')

    properties.push({
      rowNumber,
      draft: {
        ...draftDefaults,
        customerName,
        phone: mobile,
        landline: isValidPhone(landlineRaw) ? landlineRaw : '',
        email: isValidEmail(email) ? email : '',
        fullAddress,
        postcode: postcode.toUpperCase(),
      },
    })
  }

  return { properties, skipped, recognized: true }
}
