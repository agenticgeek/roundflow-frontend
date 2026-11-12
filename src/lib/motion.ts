/** Return true when the user prefers reduced motion (false where matchMedia is unavailable, e.g. some test DOMs). */
export function prefersReducedMotion(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}
