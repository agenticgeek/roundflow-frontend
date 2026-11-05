import { todaysWorkContent } from '@/content/todays-work'

/**
 * When the aggregate was computed: the API's `generatedAt` (GAP-035 part 2), else the query's
 * `dataUpdatedAt` (an unparseable or missing `generatedAt`).
 */
export function todayUpdatedAt(generatedAt: string | null | undefined, dataUpdatedAt: number): number {
  const parsed = generatedAt ? Date.parse(generatedAt) : Number.NaN
  return Number.isNaN(parsed) ? dataUpdatedAt : parsed
}

/** "Updated 14:32" (replaces the hardcoded time). Empty before the first load. */
export function formatUpdatedLabel(timestamp: number | null | undefined): string {
  if (!timestamp) return ''
  const time = new Date(timestamp).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  return todaysWorkContent.header.lastUpdated.replace('{time}', time)
}
