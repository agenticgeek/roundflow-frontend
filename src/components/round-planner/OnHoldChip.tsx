import { plannerHoldContent } from '@/content/round-planner'

/** "On hold" chip on a planner stop whose customer is on payment hold (GAP-026). */
export function OnHoldChip({ paymentHold }: { paymentHold: boolean }) {
  if (!paymentHold) return null
  return (
    <span className="rounded-md bg-warning-surface px-1.5 py-0.5 text-[10px] font-semibold text-warning">
      {plannerHoldContent.onHold}
    </span>
  )
}
