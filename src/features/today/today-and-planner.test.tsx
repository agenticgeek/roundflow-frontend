import { describe, expect, it, vi } from 'vitest'
import { act, renderHook, render, screen } from '@testing-library/react'
import { todaysWorkContent } from '@/content/todays-work'
import { todayIso } from '@/lib/round-dates'

const today = todayIso()
const mocks = vi.hoisted(() => ({ refetch: vi.fn(), dataUpdatedAt: 0 }))

vi.mock('@/features/today/hooks/useToday', () => ({
  useToday: () => ({
    data: { date: '2026-10-30', rounds: [], technicians: [], dayClosed: false },
    dataUpdatedAt: mocks.dataUpdatedAt,
    isSuccess: true,
    isFetching: false,
    refetch: mocks.refetch,
  }),
}))
vi.mock('@/features/rounds/hooks/useRounds', () => ({
  useRounds: () => ({ data: [{ id: 'r1', name: 'Alnwick Fri' }] }),
  useRoundsOccurrences: () => ({ isLoading: false, byRoundId: new Map([['r1', [{ date: today, stopCount: 3 }]]]) }),
  useRoundsOccurrenceDays: () => ({
    isLoading: false,
    byDate: new Map([
      [
        today,
        new Map([
          [
            'r1',
            {
              stops: [
                { visitId: 'a', status: 'SCHEDULED', technicianId: null },
                { visitId: 'b', status: 'CANCELLED', technicianId: null },
                { visitId: 'c', status: 'SKIPPED', technicianId: null },
              ],
            },
          ],
        ]),
      ],
    ]),
  }),
}))

const { useTodaysWorkInteractions } = await import('@/hooks/use-todays-work-interactions')
const { useUnassignedRoundsAlert } = await import('@/features/rounds/hooks/useUnassignedRoundsAlert')
const { TodaysWorkRoundsTable } = await import('@/components/todays-work/TodaysWorkRoundsTable')
const { mapJobStatus } = await import('@/features/today/lib/mappers')
await import('@/components/todays-work/TodaysWorkRoundDetailPanel')

describe('Today’s Work (GAP-035)', () => {
  it('shows when the data was really fetched, not a hardcoded time', () => {
    mocks.dataUpdatedAt = new Date(2026, 9, 30, 9, 41).getTime()
    const { result } = renderHook(() => useTodaysWorkInteractions())
    expect(result.current.lastUpdated).toBe('Updated 09:41')
    act(() => result.current.refresh())
    expect(mocks.refetch).toHaveBeenCalled()
  })

  it('has no ETA column (the estimate is a stub)', () => {
    render(
      <table>
        <TodaysWorkRoundsTable
          columns={todaysWorkContent.table.columns}
          emptyLabel="Nothing"
          rows={[]}
          selectedRoundId={null}
          onSelectRound={vi.fn()}
        />
      </table>,
    )
    expect(screen.queryByText('ETA')).not.toBeInTheDocument()
    expect(screen.getByText('Nothing').closest('td')).toHaveAttribute('colspan', '10')
  })
})

describe('Phase 2: CANCELLED visits', () => {
  it('map to a cancelled job on Today’s Work', () => {
    expect(['COMPLETED', 'SKIPPED', 'IN_PROGRESS', 'SCHEDULED', 'CANCELLED', 'NEW'].map((s) => mapJobStatus(s as never))).toEqual([
      'completed',
      'skipped',
      'in-progress',
      'scheduled',
      'cancelled',
      'scheduled',
    ])
  })

  it('don’t count as needing a technician', () => {
    const { result } = renderHook(() => useUnassignedRoundsAlert())
    expect(result.current?.totalVisits).toBe(1)
  })
})
