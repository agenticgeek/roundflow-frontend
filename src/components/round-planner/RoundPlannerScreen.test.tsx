import { describe, expect, it, vi } from 'vitest'
import { act, renderHook, screen } from '@testing-library/react'
import { renderWithProviders } from '@/test/render'

const mocks = vi.hoisted(() => ({ mapProps: null as Record<string, unknown> | null }))

vi.mock('@/components/round-planner/RoundPlannerMapSection', () => ({
  RoundPlannerMapSection: (props: Record<string, unknown>) => {
    mocks.mapProps = props
    return <p>map section</p>
  },
}))
vi.mock('@/features/rounds/hooks/useUnassignedRoundsAlert', () => ({ useUnassignedRoundsAlert: () => null }))
const fanOut = { byRoundId: new Map(), isLoading: false, isFetching: false, isError: false, error: undefined, refetch: vi.fn() }
vi.mock('@/features/rounds/hooks/useRounds', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/rounds/hooks/useRounds')>()),
  useRounds: () => ({
    data: [{ id: 'r1', name: 'Alnwick Fri', status: 'ACTIVE' }],
    isSuccess: true,
    isLoading: false,
    isFetching: false,
    isError: false,
    refetch: vi.fn(),
  }),
  useRoundDetails: () => fanOut,
  useRoundsOccurrences: () => fanOut,
  useRoundsOccurrenceDay: () => fanOut,
}))
vi.mock('@/features/settings/hooks/useSettings', () => ({
  useRoundSettings: () => ({ data: { currency: 'GBP', defaultCycleLength: 28 } }),
}))
vi.mock('@/features/technicians/hooks/useTechnicians', () => ({
  useTechniciansList: () => ({ data: [] }),
}))

const { RoundPlannerScreen } = await import('@/components/round-planner/RoundPlannerScreen')
const { useRoundPlannerInteractions } = await import('@/hooks/use-round-planner-interactions')

describe('RoundPlannerScreen map view (GAP-023)', () => {
  it('hands the map the rounds, filters and the planner window', () => {
    const { result } = renderHook(() => useRoundPlannerInteractions())
    act(() => {
      result.current.setView('map')
      result.current.setTechnicianId('t1')
      result.current.setSearch(' Hotspur ')
    })
    renderWithProviders(<RoundPlannerScreen interactions={result.current} />)
    expect(screen.getByText('map section')).toBeInTheDocument()
    expect(mocks.mapProps).toMatchObject({
      rounds: [expect.objectContaining({ id: 'r1' })],
      filter: { technicianId: 't1', statusId: 'all', query: 'hotspur' },
      selectedDate: result.current.selectedDate,
      currency: 'GBP',
    })
    expect(typeof mocks.mapProps?.minDate).toBe('string')
  })
})
