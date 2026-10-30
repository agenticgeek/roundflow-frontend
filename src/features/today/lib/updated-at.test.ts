import { describe, expect, it } from 'vitest'
import { formatUpdatedLabel } from '@/features/today/lib/updated-at'

describe('formatUpdatedLabel', () => {
  it('formats the fetch time and is empty before the first load', () => {
    const at = new Date(2026, 9, 30, 14, 5).getTime()
    expect(formatUpdatedLabel(at)).toBe('Updated 14:05')
    expect(formatUpdatedLabel(0)).toBe('')
    expect(formatUpdatedLabel(undefined)).toBe('')
  })
})
