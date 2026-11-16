import { describe, expect, it, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { addDays, todayIso } from '@/lib/round-dates'

const mocks = vi.hoisted(() => ({
  occurrences: [] as Array<Record<string, unknown>>,
  dayRequests: [] as unknown[],
  closures: undefined as Array<Record<string, unknown>> | undefined,
}))

vi.mock('@/features/closures/hooks/useClosures', () => ({
  useClosures: () => ({ data: mocks.closures ? { closures: mocks.closures } : undefined }),
}))

vi.mock('@/features/rounds/hooks/useRounds', () => ({
  useRounds: () => ({ data: [{ id: 'r1', name: 'Alnwick Mon 8wk' }] }),
  useRoundsOccurrences: () => ({ byRoundId: new Map([['r1', mocks.occurrences]]), isLoading: false }),
  useRoundsOccurrenceDays: (requests: unknown[]) => {
    mocks.dayRequests = requests
    return { byDate: new Map(), isLoading: false }
  },
}))

const { useUnassignedRoundsAlert } = await import('@/features/rounds/hooks/useUnassignedRoundsAlert')

const occ = (date: string, extra: Record<string, unknown> = {}) => ({ date, stopCount: 3, totalValue: 90, completedCount: 0, completionPct: 0, holdCount: 0, issueCount: 0, ...extra })

describe('useUnassignedRoundsAlert and forecast occurrences', () => {
  it('only asks for the day stops of real visit days, never for projected (forecast) days', () => {
    const soon = addDays(todayIso(), 2)
    const later = addDays(todayIso(), 5)
    mocks.occurrences = [occ(soon), occ(later, { projected: true })]
    renderHook(() => useUnassignedRoundsAlert())
    expect(mocks.dayRequests).toEqual([{ date: soon, roundIds: ['r1'] }])
  })

  describe('business closures', () => {
    const closure = (extra: Record<string, unknown>) => ({
      id: 'k1', label: 'Christmas', mode: 'MOVE', notifyCustomers: false, roundIds: [], appliedAt: null, createdAt: '', updatedAt: '', ...extra,
    })

    it('does not ask for the day stops of a day the business is closed for that round', () => {
      const closed = addDays(todayIso(), 2)
      const open = addDays(todayIso(), 4)
      mocks.occurrences = [occ(closed), occ(open)]
      mocks.closures = [closure({ startDate: closed, endDate: closed })]
      renderHook(() => useUnassignedRoundsAlert())
      expect(mocks.dayRequests).toEqual([{ date: open, roundIds: ['r1'] }])
    })

    it('still asks for the day when the closure is scoped to a different round', () => {
      const day = addDays(todayIso(), 2)
      mocks.occurrences = [occ(day)]
      mocks.closures = [closure({ startDate: day, endDate: day, roundIds: ['other-round'] })]
      renderHook(() => useUnassignedRoundsAlert())
      expect(mocks.dayRequests).toEqual([{ date: day, roundIds: ['r1'] }])
    })

    it('still asks for the day while the closures are loading or failed to load', () => {
      const day = addDays(todayIso(), 2)
      mocks.occurrences = [occ(day)]
      mocks.closures = undefined
      renderHook(() => useUnassignedRoundsAlert())
      expect(mocks.dayRequests).toEqual([{ date: day, roundIds: ['r1'] }])
    })
  })
})
