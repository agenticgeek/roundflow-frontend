import { describe, expect, it } from 'vitest'
import { exhaustiveFallback, VISIT_STATUSES } from '@/lib/visit-status'

describe('visit-status', () => {
  it('lists CANCELLED alongside the spec statuses', () => {
    expect(VISIT_STATUSES).toContain('CANCELLED')
  })

  it('exhaustiveFallback returns the fallback for a value the web doesn’t know yet', () => {
    expect(exhaustiveFallback('NEW_STATUS' as never, 'scheduled')).toBe('scheduled')
  })
})
