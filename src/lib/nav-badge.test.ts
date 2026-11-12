import { afterEach, describe, expect, it, vi } from 'vitest'
import { dismissNavBadge, isNavBadgeDismissed, resetNavBadgeSession } from '@/lib/nav-badge'

afterEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
  resetNavBadgeSession()
})

describe('nav badge dismissal', () => {
  it('is remembered per user in this browser', () => {
    expect(isNavBadgeDismissed('flo-ai', 'u1')).toBe(false)
    dismissNavBadge('flo-ai', 'u1')
    expect(isNavBadgeDismissed('flo-ai', 'u1')).toBe(true)
    expect(isNavBadgeDismissed('flo-ai', 'u2')).toBe(false)
    resetNavBadgeSession()
    expect(isNavBadgeDismissed('flo-ai', 'u1')).toBe(true) // still in localStorage
    expect(isNavBadgeDismissed('flo-ai')).toBe(false)
  })

  it('still works for this session when storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    dismissNavBadge('flo-ai')
    expect(isNavBadgeDismissed('flo-ai')).toBe(true)
  })
})
