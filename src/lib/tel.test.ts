import { describe, expect, it } from 'vitest'
import { telHref } from '@/lib/tel'

describe('telHref', () => {
  it('keeps digits and a leading plus only', () => {
    expect(telHref('07123 456 789')).toBe('tel:07123456789')
    expect(telHref('+44 (0)7123-456789')).toBe('tel:+4407123456789')
    expect(telHref(' +44 1665 510 000 ')).toBe('tel:+441665510000')
  })

  it('returns null when there is no number to call', () => {
    expect(telHref('')).toBeNull()
    expect(telHref('—')).toBeNull()
    expect(telHref(null)).toBeNull()
    expect(telHref(undefined)).toBeNull()
  })
})
