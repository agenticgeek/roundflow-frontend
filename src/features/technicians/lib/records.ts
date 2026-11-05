import type { TechnicianAvailability } from '@/api/technician-records.api'
import type { TechnicianListItem } from '@/api/technicians.api'
import { technicianRecordsContent } from '@/content/technician-records'
import { formatInvoiceDate } from '@/features/invoices/lib/mappers'
import { formatCurrency } from '@/lib/utils'

/** 125 → "2h 05m"; null (no timed visits in the period) → "—". */
export function formatMinutes(minutes: number | null): string {
  if (minutes === null) return '—'
  const rounded = Math.round(minutes)
  const hours = Math.floor(rounded / 60)
  const rest = String(rounded % 60).padStart(2, '0')
  return hours > 0 ? `${hours}h ${rest}m` : `${rounded}m`
}

export function formatMoneyOrDash(value: number | null): string {
  return value === null ? '—' : formatCurrency(value)
}

/** "2 Nov 2026 – 6 Nov 2026"; a 2099 end date (open-ended replace) reads "until further notice". */
export function formatAvailabilityRange(window: Pick<TechnicianAvailability, 'from' | 'to'>): string {
  const from = formatInvoiceDate(window.from)
  if (window.to.startsWith('2099')) return `${from} – ${technicianRecordsContent.availability.openEnded}`
  return `${from} – ${formatInvoiceDate(window.to)}`
}

/** Technicians who can take over: active, invite accepted, and not the one being replaced. */
export function replacementOptions(technicians: readonly TechnicianListItem[] | undefined, selfId: string) {
  return (technicians ?? [])
    .filter((technician) => technician.id !== selfId && technician.active && technician.appStatus === 'ACTIVE')
    .map((technician) => ({ value: technician.id, label: technician.name ?? 'Unnamed technician' }))
}
