import type { PauseResult } from '@/api/properties.api'
import { propertyDetailContent } from '@/content/property-detail'
import { formatInvoiceDate } from '@/features/invoices/lib/mappers'

/** "N scheduled visits will be cancelled" for a pause response (A4 · GAP-020). */
export function cancelledVisitsLabel(count: number): string {
  const copy = propertyDetailContent.pauseServiceModal.outcome
  if (count === 0) return copy.cancelledNone
  if (count === 1) return copy.cancelledOne
  return copy.cancelled.replace('{count}', String(count))
}

/** Toast for a pause: paused now, or scheduled for a future start, plus the cancelled visits. */
export function pauseOutcomeToast(result: Pick<PauseResult, 'cancelledVisits' | 'pauseScheduled'>, startDate: string) {
  const copy = propertyDetailContent.pauseServiceModal.outcome
  return {
    title: result.pauseScheduled ? copy.scheduled.replace('{date}', formatInvoiceDate(startDate)) : copy.paused,
    description: cancelledVisitsLabel(result.cancelledVisits),
  }
}
