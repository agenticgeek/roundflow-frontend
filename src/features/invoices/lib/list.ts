import { invoicesContent } from '@/content/invoices'

export type ChipTone = 'neutral' | 'info' | 'success' | 'danger' | 'warning'

const STATUS_TONES: Record<string, ChipTone> = {
  DRAFT: 'neutral',
  SENT: 'info',
  PAID: 'success',
  VOID: 'neutral',
  PENDING: 'warning',
  NOT_DUE: 'neutral',
  FAILED: 'danger',
  OVERDUE: 'danger',
  CANCELLED: 'neutral',
}

/** Chip colour for an invoice or payment status; unknown values are neutral. */
export function statusTone(status: string): ChipTone {
  return STATUS_TONES[status] ?? 'neutral'
}

/** The option label for `value` in one of the content option lists, or the raw value. */
export function optionLabel(options: readonly { value: string; label: string }[], value: string | null | undefined): string {
  if (!value) return invoicesContent.noValue
  return options.find((option) => option.value === value)?.label ?? value
}

/** `2026-10-30T…` → `30 Oct 2026`; null / unparseable → "—". */
export function formatListDate(iso: string | null | undefined): string {
  if (!iso) return invoicesContent.noValue
  const date = new Date(`${iso.slice(0, 10)}T00:00:00.000Z`)
  if (Number.isNaN(date.getTime())) return invoicesContent.noValue
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
}

/** `12.5` → `£12.50`. */
export function formatListMoney(value: number): string {
  return `£${value.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/** Drops empty filter values so the query key and URL stay minimal. */
export function compactFilters<T extends Record<string, string | number | undefined>>(filters: T): Partial<T> {
  return Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== '' && value !== undefined)) as Partial<T>
}

/** Only DRAFT / SENT invoices can be sent or marked paid. */
export function isOpenInvoice(status: string): boolean {
  return status === 'DRAFT' || status === 'SENT'
}

/** `invoices-2026-10-30.csv`. */
export function exportFilename(kind: 'invoices' | 'payments', today: string): string {
  return `${kind}-${today}.csv`
}
