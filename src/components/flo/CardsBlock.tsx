import type { FloCardsBlock } from '@/api/flo.api'
import { formatFloValue } from '@/features/flo/lib/format'

const TONE: Record<string, string> = {
  positive: 'text-success',
  good: 'text-success',
  negative: 'text-danger',
  bad: 'text-danger',
  warning: 'text-warning-foreground',
}

/** Headline figures. Values and formats come from the server; this only lays them out. */
export function CardsBlock({ block }: { block: FloCardsBlock }) {
  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {block.items.map((item, index) => (
        <div key={`${item.label}-${index}`} className="rounded-xl border border-border bg-background p-3">
          <dt className="text-xs text-muted">{item.label}</dt>
          <dd className={`mt-1 text-xl font-semibold tabular-nums ${TONE[item.tone ?? ''] ?? 'text-foreground'}`}>
            {formatFloValue(item.value, item.format)}
          </dd>
          {item.sub ? <dd className="mt-0.5 text-xs text-muted">{item.sub}</dd> : null}
        </div>
      ))}
    </dl>
  )
}
