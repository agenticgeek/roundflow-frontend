import type { FloCell, FloFormat } from '@/api/flo.api'
import { floContent } from '@/content/flo'
import type { FloStatusLine } from '@/features/flo/lib/stream-reducer'
import { fillCopy, formatCurrency } from '@/lib/utils'

const integer = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 0 })
const percent = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 1 })
const date = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })

/**
 * A cell or card value drawn from the column's declared `format`. The server builds the values; this
 * only formats them: `currency` is GBP, `percent` is already in percent (96.4 shows "96.4%"), `date` is
 * an ISO date. A value that does not fit its format is shown as it came, never as `NaN`.
 */
export function formatFloValue(value: FloCell | undefined, format: FloFormat = 'text'): string {
  if (value === null || value === undefined || value === '') return floContent.table.empty
  if (format === 'text') return String(value)
  if (format === 'date') {
    const parsed = new Date(String(value))
    return Number.isNaN(parsed.getTime()) ? String(value) : date.format(parsed)
  }
  if (typeof value !== 'number' || !Number.isFinite(value)) return String(value)
  if (format === 'currency') return formatCurrency(value)
  return format === 'percent' ? `${percent.format(value)}%` : integer.format(value)
}

/** "Checking: debt, payments" while sources are being read, "Checked 6 data sources" once they are done, else ''. */
export function statusLine(statuses: readonly FloStatusLine[]): string {
  const checking = statuses.filter((line) => !line.done)
  if (checking.length > 0) return fillCopy(floContent.working.checking, { labels: checking.map((line) => line.label).join(', ') })
  if (statuses.length === 0) return ''
  return statuses.length === 1 ? floContent.working.checkedOne : fillCopy(floContent.working.checked, { count: statuses.length })
}
