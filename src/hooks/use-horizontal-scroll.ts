import { useCallback, useEffect, useRef, useState } from 'react'
import { prefersReducedMotion } from '@/lib/motion'

/** Slide a horizontal track with CSS transform — no native scroll, no scrollbar glitches. */
export function useHorizontalScroll<TTrack extends HTMLElement, TContainer extends HTMLElement>() {
  const trackRef = useRef<TTrack>(null)
  const containerRef = useRef<TContainer>(null)
  const [offset, setOffset] = useState(0)
  const [canScrollStart, setCanScrollStart] = useState(false)
  const [canScrollEnd, setCanScrollEnd] = useState(false)

  const getMaxOffset = useCallback(() => {
    const track = trackRef.current
    const container = containerRef.current
    if (!track || !container) return 0
    return Math.max(0, track.scrollWidth - container.clientWidth)
  }, [])

  const syncBounds = useCallback(
    (nextOffset: number) => {
      const max = getMaxOffset()
      const clamped = Math.min(Math.max(nextOffset, 0), max)
      setCanScrollStart(clamped > 1)
      setCanScrollEnd(clamped < max - 1)
      return clamped
    },
    [getMaxOffset],
  )

  const setClampedOffset = useCallback(
    (value: number | ((prev: number) => number)) => {
      setOffset((prev) => {
        const next = typeof value === 'function' ? value(prev) : value
        return syncBounds(next)
      })
    },
    [syncBounds],
  )

  const scrollNext = useCallback(() => {
    const container = containerRef.current
    if (!container) return
    setClampedOffset((prev) => prev + container.clientWidth * 0.72)
  }, [setClampedOffset])

  const scrollPrev = useCallback(() => {
    const container = containerRef.current
    if (!container) return
    setClampedOffset((prev) => prev - container.clientWidth * 0.72)
  }, [setClampedOffset])

  /** Bring a child item (by selector) into the visible viewport without fighting manual slides. */
  const scrollItemIntoView = useCallback(
    (selector: string) => {
      const track = trackRef.current
      const container = containerRef.current
      if (!track || !container) return

      const item = track.querySelector(selector) as HTMLElement | null
      if (!item) return

      setOffset((prev) => {
        const max = Math.max(0, track.scrollWidth - container.clientWidth)
        const itemLeft = item.offsetLeft
        const itemRight = itemLeft + item.offsetWidth
        const viewLeft = prev
        const viewRight = prev + container.clientWidth

        let next = prev
        if (itemLeft < viewLeft) next = itemLeft
        else if (itemRight > viewRight) next = itemRight - container.clientWidth

        return syncBounds(Math.min(Math.max(next, 0), max))
      })
    },
    [syncBounds],
  )

  useEffect(() => {
    setOffset((prev) => syncBounds(prev))
  }, [syncBounds])

  useEffect(() => {
    const track = trackRef.current
    const container = containerRef.current
    if (!track || !container) return

    const observer = new ResizeObserver(() => {
      setOffset((prev) => syncBounds(prev))
    })

    observer.observe(track)
    observer.observe(container)
    return () => observer.disconnect()
  }, [syncBounds])

  const transitionClass = prefersReducedMotion() ? '' : 'transition-transform duration-300 ease-out'

  return {
    trackRef,
    containerRef,
    offset,
    canScrollStart,
    canScrollEnd,
    scrollNext,
    scrollPrev,
    scrollItemIntoView,
    transitionClass,
  }
}
