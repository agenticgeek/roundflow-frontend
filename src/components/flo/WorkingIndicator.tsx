import { floContent } from '@/content/flo'
import { Spinner } from '@/components/ui/spinner'
import { statusLine } from '@/features/flo/lib/format'
import type { FloStatusLine } from '@/features/flo/lib/stream-reducer'
import { fillCopy } from '@/lib/utils'

/** The live "Checking: …" line with an elapsed timer. Not a live region: the page announces status changes once. */
export function WorkingIndicator({ statuses, elapsed }: { statuses: readonly FloStatusLine[]; elapsed: number }) {
  return (
    <p className="flex items-center gap-2 text-sm text-muted">
      <Spinner />
      <span>{statusLine(statuses) || floContent.working.thinking}</span>
      <span className="tabular-nums">{fillCopy(floContent.working.elapsed, { seconds: elapsed })}</span>
    </p>
  )
}
