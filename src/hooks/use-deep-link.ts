import { useRef, type RefObject } from 'react'
import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { readDeepLink, type DeepLink } from '@/lib/deep-link'

/** The `?visitId=&round=&date=` the page was opened with, read once (later URL edits do not move the page). */
export function useDeepLink(): DeepLink {
  const [params] = useSearchParams()
  const link = useRef<DeepLink | null>(null)
  link.current ??= readDeepLink(params)
  return link.current
}

/**
 * For the item a deep link points at: scrolls it into view and moves keyboard focus to it (so a screen
 * reader announces it). The element needs `tabIndex={-1}`. Does nothing when `active` is false.
 */
export function useHighlightFocus<T extends HTMLElement>(active: boolean): RefObject<T | null> {
  const ref = useRef<T | null>(null)
  useEffect(() => {
    if (!active || !ref.current) return
    ref.current.scrollIntoView?.({ block: 'center' })
    ref.current.focus({ preventScroll: true })
  }, [active])
  return ref
}
