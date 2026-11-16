import { describe, expect, it, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { addDays, todayIso } from '@/lib/round-dates'

const mocks = vi.hoisted(() => ({ occurrences: [] as Array<Record<string, unknown>>, dayRequests: [] as unknown[] }))

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
})
