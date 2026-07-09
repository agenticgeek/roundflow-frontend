import { useEffect, useState } from 'react'
import { prefersReducedMotion } from '@/lib/motion'

export interface StaggeredRevealOptions {
  /** Total number of items to reveal. */
  count: number
  /** Start revealing only when this becomes true. */
  active?: boolean
  /** Delay before the first item appears. */
  startDelay?: number
  /** Delay between each subsequent item. */
  staggerMs?: number
}

/**
 * Reveal a list of items one-by-one. Returns a predicate to check if an index
 * should be visible — pair with a CSS reveal animation for the effect.
 */
export function useStaggeredReveal({
  count,
  active = true,
  startDelay = 0,
  staggerMs = 130,
}: StaggeredRevealOptions) {
  const [visibleCount, setVisibleCount] = useState(0)

  useEffect(() => {
    if (!active || count === 0) {
      setVisibleCount(0)
      return
    }

    if (prefersReducedMotion()) {
      setVisibleCount(count)
      return
    }

    setVisibleCount(0)
    const timers: ReturnType<typeof setTimeout>[] = []

    for (let index = 0; index < count; index += 1) {
      timers.push(
        setTimeout(() => setVisibleCount(index + 1), startDelay + index * staggerMs),
      )
    }

    return () => timers.forEach(clearTimeout)
  }, [active, count, startDelay, staggerMs])

  const isVisible = (index: number) => index < visibleCount
  const allVisible = visibleCount >= count

  return { isVisible, allVisible, visibleCount }
}
