import { floContent } from '@/content/flo'
import type { FloSentence } from '@/features/flo/lib/stream-reducer'
import { useTypewriter } from '@/hooks/use-typewriter'

const TYPING_MS = 12

/**
 * One sentence of plain text. While the answer streams it types in (all at once under
 * prefers-reduced-motion); a finished answer shows it whole. `unverified` adds a small marker.
 */
export function Sentence({ sentence, animate }: { sentence: FloSentence; animate: boolean }) {
  const typed = useTypewriter({ text: sentence.text, speed: TYPING_MS, enabled: animate })
  return (
    <>
      {animate ? typed.displayedText : sentence.text}
      {sentence.unverified ? (
        <span
          title={floContent.unverified.markerLabel}
          className="ml-1.5 inline-block rounded border border-warning-border bg-warning-surface px-1.5 align-middle text-xs font-medium text-warning-foreground"
        >
          {floContent.unverified.marker}
        </span>
      ) : null}
    </>
  )
}
