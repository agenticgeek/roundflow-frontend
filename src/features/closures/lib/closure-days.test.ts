import { describe, expect, it } from 'vitest'
import { closureForDate, closuresForDate } from '@/features/closures/lib/closure-days'
import type { Closure } from '@/features/closures/types'

function closure(over: Partial<Closure>): Closure {
  return {
    id: 'c1', label: 'Christmas', startDate: '2026-12-24', endDate: '2027-01-03', mode: 'MOVE',
    notifyCustomers: false, roundIds: [], appliedAt: null, createdAt: '', updatedAt: '', ...over,
  }
}

describe('closuresForDate', () => {
  const xmas = closure({})

  it('returns nothing with no closures', () => {
    expect(closuresForDate('2026-12-25', [])).toEqual([])
    expect(closureForDate('2026-12-25', [])).toBeNull()
  })

  it('covers first day, inside and last day, but not the day before or after', () => {
    expect(closuresForDate('2026-12-23', [xmas])).toEqual([])
    expect(closuresForDate('2026-12-24', [xmas])).toEqual([xmas])
    expect(closuresForDate('2026-12-31', [xmas])).toEqual([xmas])
    expect(closuresForDate('2027-01-03', [xmas])).toEqual([xmas])
    expect(closuresForDate('2027-01-04', [xmas])).toEqual([])
  })

  it('treats empty roundIds as all rounds, with or without a round filter', () => {
    expect(closuresForDate('2026-12-25', [xmas], 'r1')).toEqual([xmas])
    expect(closuresForDate('2026-12-25', [xmas])).toEqual([xmas])
  })

  it('scopes to named rounds when a round is given, and ignores scope when none is given', () => {
    const scoped = closure({ id: 'c2', roundIds: ['r1'] })
    expect(closuresForDate('2026-12-25', [scoped], 'r1')).toEqual([scoped])
    expect(closuresForDate('2026-12-25', [scoped], 'r2')).toEqual([])
    expect(closuresForDate('2026-12-25', [scoped])).toEqual([scoped])
  })

  it('returns overlapping closures by start date and the first one from closureForDate', () => {
    const late = closure({ id: 'late', startDate: '2026-12-28', endDate: '2027-01-02' })
    const early = closure({ id: 'early', startDate: '2026-12-20', endDate: '2026-12-30' })
    const list = [late, early]
    expect(closuresForDate('2026-12-29', list).map((c) => c.id)).toEqual(['early', 'late'])
    expect(closureForDate('2026-12-29', list)?.id).toBe('early')
    expect(list.map((c) => c.id)).toEqual(['late', 'early'])
  })

  it('handles single-day closures and invalid input', () => {
    const one = closure({ id: 'one', startDate: '2026-12-25', endDate: '2026-12-25' })
    expect(closureForDate('2026-12-25', [one])).toBe(one)
    expect(closuresForDate('', [xmas])).toEqual([])
    expect(closuresForDate('25/12/2026', [xmas])).toEqual([])
    expect(closuresForDate('2026-12-25T00:00:00Z', [xmas])).toEqual([])
    expect(closureForDate('nonsense', [xmas])).toBeNull()
  })
})
