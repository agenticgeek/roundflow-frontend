import { describe, expect, it, vi } from 'vitest'
import { act, renderHook, screen } from '@testing-library/react'
import { renderWithProviders } from '@/test/render'
import { roundPlannerContent } from '@/content/round-planner'
import { todayIsoDate } from '@/features/rounds/lib/planner'

// Forecast (projected) occurrences feed the calendar only: never the KPIs, the "no visits" check or a status filter.

const mocks = vi.hoisted(() => ({ occurrences: [] as Array<Record<string, unknown>> }))

vi.mock('@/components/round-planner/RoundPlannerMapSection', () => ({ RoundPlannerMapSection: () => <p>map section</p> }))
vi.mock('@/features/rounds/hooks/useUnassignedRoundsAlert', () => ({ useUnassignedRoundsAlert: () => null }))
const base = { isLoading: false, isFetching: false, isError: false, error: undefined, refetch: vi.fn() }
vi.mock('@/features/rounds/hooks/useRounds', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/rounds/hooks/useRounds')>()),
  useRounds: () => ({ data: [{ id: 'r1', name: 'Alnwick Mon 8wk', status: 'ACTIVE' }], isSuccess: true, isLoading: false, isFetching: false, isError: false, refetch: vi.fn() }),
  useRoundDetails: () => ({ ...base, byRoundId: new Map() }),
  useRoundsOccurrences: () => ({ ...base, byRoundId: new Map([['r1', mocks.occurrences]]) }),
  useRoundsOccurrenceDay: () => ({ ...base, byRoundId: new Map() }),
}))
vi.mock('@/features/settings/hooks/useSettings', () => ({ useRoundSettings: () => ({ data: { currency: 'GBP', defaultCycleLength: 28 } }) }))
vi.mock('@/features/technicians/hooks/useTechnicians', () => ({ useTechniciansList: () => ({ data: [] }) }))

const { RoundPlannerScreen } = await import('@/components/round-planner/RoundPlannerScreen')
const { useRoundPlannerInteractions } = await import('@/hooks/use-round-planner-interactions')

const projected = (date: string) => ({ date, stopCount: 12, totalValue: 300, completedCount: 0, completionPct: 0, holdCount: 0, issueCount: 0, technicians: [], projected: true })

function renderScreen(setup?: (i: ReturnType<typeof useRoundPlannerInteractions>) => void) {
  const { result } = renderHook(() => useRoundPlannerInteractions())
  if (setup) act(() => setup(result.current))
  return renderWithProviders(<RoundPlannerScreen interactions={result.current} />)
}

describe('RoundPlannerScreen with projected occurrences', () => {
  it('shows the forecast card on the calendar but still reports "no visits" and zero KPIs when only forecasts exist', () => {
    mocks.occurrences = [projected(todayIsoDate())]
    renderScreen()
    expect(screen.getByLabelText(roundPlannerContent.calendar.projected.aria)).toBeInTheDocument()
    expect(screen.getByText(`${roundPlannerContent.states.noVisitsInWindow}.`)).toBeInTheDocument()
  })

  it('a status filter other than All hides the forecast card', () => {
    mocks.occurrences = [projected(todayIsoDate())]
    renderScreen((i) => i.setStatusId('not_started'))
    expect(screen.queryByLabelText(roundPlannerContent.calendar.projected.aria)).not.toBeInTheDocument()
  })

  it('a real visit in the window means no "no visits" message, and its card is unaffected by the forecast', () => {
    mocks.occurrences = [
      { date: todayIsoDate(), stopCount: 3, totalValue: 90, completedCount: 0, completionPct: 0, holdCount: 0, issueCount: 0, technicians: [] },
      projected(todayIsoDate()),
    ]
    renderScreen()
    expect(screen.queryByText(`${roundPlannerContent.states.noVisitsInWindow}.`)).not.toBeInTheDocument()
    expect(screen.getAllByLabelText(roundPlannerContent.calendar.projected.aria)).toHaveLength(1)
  })
})
