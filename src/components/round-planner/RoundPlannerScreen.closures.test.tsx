import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook, screen } from '@testing-library/react'
import { renderWithProviders } from '@/test/render'
import { roundPlannerContent } from '@/content/round-planner'
import { todayIsoDate } from '@/features/rounds/lib/planner'
import type { Closure } from '@/features/closures/types'

// Business closures are an overlay on the planner calendar: shaded and labelled days, no effect on the "no visits"
// message, and a failing closures request must not break the planner.

const mocks = vi.hoisted(() => ({ closures: {} as Record<string, unknown>, params: [] as unknown[] }))

vi.mock('@/components/round-planner/RoundPlannerMapSection', () => ({ RoundPlannerMapSection: () => <p>map section</p> }))
vi.mock('@/features/rounds/hooks/useUnassignedRoundsAlert', () => ({ useUnassignedRoundsAlert: () => null }))
vi.mock('@/features/closures/hooks/useClosures', () => ({
  useClosures: (params: unknown) => {
    mocks.params.push(params)
    return mocks.closures
  },
}))
const base = { isLoading: false, isFetching: false, isError: false, error: undefined, refetch: vi.fn() }
vi.mock('@/features/rounds/hooks/useRounds', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/rounds/hooks/useRounds')>()),
  useRounds: () => ({ data: [{ id: 'r1', name: 'Alnwick Mon', status: 'ACTIVE' }], isSuccess: true, isLoading: false, isFetching: false, isError: false, refetch: vi.fn() }),
  useRoundDetails: () => ({ ...base, byRoundId: new Map() }),
  useRoundsOccurrences: () => ({ ...base, byRoundId: new Map() }),
  useRoundsOccurrenceDay: () => ({ ...base, byRoundId: new Map() }),
}))
vi.mock('@/features/settings/hooks/useSettings', () => ({ useRoundSettings: () => ({ data: { currency: 'GBP', defaultCycleLength: 28 } }) }))
vi.mock('@/features/technicians/hooks/useTechnicians', () => ({ useTechniciansList: () => ({ data: [] }) }))

const { RoundPlannerScreen } = await import('@/components/round-planner/RoundPlannerScreen')
const { useRoundPlannerInteractions } = await import('@/hooks/use-round-planner-interactions')

function closure(overrides: Partial<Closure> = {}): Closure {
  const today = todayIsoDate()
  return {
    id: 'c1', label: 'Christmas', startDate: today, endDate: today, mode: 'MOVE', notifyCustomers: false,
    roundIds: [], appliedAt: null, createdAt: '2026-11-01T00:00:00Z', updatedAt: '2026-11-01T00:00:00Z', ...overrides,
  }
}

function renderScreen(setup?: (i: ReturnType<typeof useRoundPlannerInteractions>) => void) {
  const { result } = renderHook(() => useRoundPlannerInteractions())
  if (setup) act(() => setup(result.current))
  return renderWithProviders(<RoundPlannerScreen interactions={result.current} />)
}

const noVisits = () => screen.queryByText(`${roundPlannerContent.states.noVisitsInWindow}.`)

beforeEach(() => {
  mocks.closures = { data: { closures: [] }, isError: false }
  mocks.params = []
})

describe('RoundPlannerScreen closures', () => {
  it('asks for the closures of the visible window only', () => {
    renderScreen()
    const params = mocks.params[0] as { from: string; to: string }
    expect(params.from).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(params.to >= params.from).toBe(true)
  })

  it('keeps the "no visits" message when there are no closures', () => {
    renderScreen()
    expect(noVisits()).toBeInTheDocument()
    expect(screen.queryByText(/Closed:/)).not.toBeInTheDocument()
  })

  it('shades and labels the closed day, and a closure does not trigger the "no visits" message', () => {
    mocks.closures = { data: { closures: [closure()] }, isError: false }
    const { container } = renderScreen()
    expect(screen.getByText('Closed: Christmas')).toBeInTheDocument()
    expect(container.querySelectorAll('[data-closed="true"]')).toHaveLength(1)
    expect(noVisits()).not.toBeInTheDocument()
    // The unassigned-rounds banner is driven by visits only; a closure adds nothing to it.
    expect(screen.queryByText(/without a technician/i)).not.toBeInTheDocument()
  })

  it('still renders the calendar, and the usual message, when the closures request fails', () => {
    mocks.closures = { data: undefined, isError: true }
    renderScreen()
    expect(screen.getByText('Mon')).toBeInTheDocument()
    expect(noVisits()).toBeInTheDocument()
    expect(screen.queryByText(/Closed:/)).not.toBeInTheDocument()
  })

  it('shades a round-scoped closure only when that round is the filter', () => {
    const scoped = closure({ roundIds: ['r1'] })
    mocks.closures = { data: { closures: [scoped] }, isError: false }
    const all = renderScreen()
    expect(screen.getByText('Closed: Christmas')).toBeInTheDocument()
    expect(all.container.querySelectorAll('[data-closed="true"]')).toHaveLength(0)
    all.unmount()

    const filtered = renderScreen((i) => i.setRoundId('r1'))
    expect(filtered.container.querySelectorAll('[data-closed="true"]')).toHaveLength(1)
    filtered.unmount()

    mocks.closures = { data: { closures: [closure({ roundIds: ['other'] })] }, isError: false }
    const elsewhere = renderScreen((i) => i.setRoundId('r1'))
    expect(elsewhere.container.querySelectorAll('[data-closed="true"]')).toHaveLength(0)
    expect(screen.queryByText(/Closed:/)).not.toBeInTheDocument()
  })
})
