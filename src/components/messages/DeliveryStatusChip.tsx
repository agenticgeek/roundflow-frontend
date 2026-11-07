import { deliveryStatusView } from '@/features/messages/lib/delivery-status'
import { cn } from '@/lib/utils'

const TONES = {
  neutral: 'bg-surface text-foreground',
  success: 'bg-success/10 text-success',
  danger: 'bg-danger/10 text-danger',
} as const

/** Email delivery status as a chip: a symbol and words, so it never relies on colour. The error, if any, follows as text. */
export function DeliveryStatusChip({ status, error }: { status: string | null | undefined; error?: string | null }) {
  const view = deliveryStatusView(status)
  if (!view) return null
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold', TONES[view.tone])}>
        <span aria-hidden="true">{view.symbol}</span>
        {view.label}
      </span>
      {error ? <span className="text-[11px] text-muted">{error}</span> : null}
    </span>
  )
}
