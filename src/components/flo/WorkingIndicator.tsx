import { floContent } from '@/content/flo'
import { statusLine } from '@/features/flo/lib/format'
import type { FloStatusLine } from '@/features/flo/lib/stream-reducer'
import { fillCopy } from '@/lib/utils'

/** The live "Checking: …" line with an elapsed timer. Not a live region: the page announces status changes once. */
export function WorkingIndicator({ statuses, elapsed }: { statuses: readonly FloStatusLine[]; elapsed: number }) {
  return (
    <p className="flex max-w-full animate-fade-in items-center gap-2.5 text-sm text-muted">
      <span aria-hidden="true" className="flex shrink-0 items-center gap-1">
        {[0, 160, 320].map((delay) => (
          <span key={delay} className="h-1.5 w-1.5 animate-dot-bounce rounded-full bg-accent" style={{ animationDelay: `${delay}ms` }} />
        ))}
      </span>
      <span className="min-w-0 truncate">
        {statusLine(statuses) || floContent.working.thinking}
      </span>
      <span className="shrink-0 text-xs tabular-nums">
        {fillCopy(floContent.working.elapsed, { seconds: elapsed })}
      </span>
    </p>
  )
}
