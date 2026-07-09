/** Return true when the user prefers reduced motion. */
export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}
