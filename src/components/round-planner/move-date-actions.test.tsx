import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook, screen } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import { RoundPlannerCalendar } from '@/components/round-planner/RoundPlannerCalendar'
import { RoundPlannerDetailPanel } from '@/components/round-planner/RoundPlannerDetailPanel'
import type { PlannerRoundCard } from '@/features/rounds/lib/planner'
import { setBootstrap } from '@/test/bootstrap'
import { server } from '@/test/msw/server'
import { mswPath, on } from '@/test/msw/typed'
import { renderWithProviders } from '@/test/render'

// Where "Move date" shows: real dates today or later (detail panel), the round's next forecast date (calendar),
// never for read-only users. Today is fixed to Wed 25 Nov 2026.

const TODAY = '2026-11-25'

const mocks = vi.hoisted(() => ({ occurrences: [] as Array<Record<string, unknown>> }))
vi.mock('@/components/round-planner/RoundPlannerMapSection', () => ({ RoundPlannerMapSection: () => <p>map section</p> }))
vi.mock('@/features/rounds/hooks/useUnassignedRoundsAlert', () => ({ useUnassignedRoundsAlert: () => null }))
const base = { isLoading: false, isFetching: false, isError: false, error: undefined, refetch: vi.fn() }
vi.mock('@/features/rounds/hooks/useRounds', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/rounds/hooks/useRounds')>()),
  useRounds: () => ({ data: [{ id: 'r1', name: 'Alnwick Fri', status: 'ACTIVE' }], isSuccess: true, isLoading: false, isFetching: false, isError: false, refetch: vi.fn() }),
  useRoundDetails: () => ({ ...base, byRoundId: new Map() }),
  useRoundsOccurrences: () => ({ ...base, byRoundId: new Map([['r1', mocks.occurrences]]) }),
  useRoundsOccurrenceDay: () => ({ ...base, byRoundId: new Map() }),
}))
vi.mock('@/features/settings/hooks/useSettings', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/settings/hooks/useSettings')>()),
  useRoundSettings: () => ({ data: { currency: 'GBP', defaultCycleLength: 28 } }),
}))
vi.mock('@/features/technicians/hooks/useTechnicians', () => ({ useTechniciansList: () => ({ data: [] }) }))

const { RoundPlannerScreen } = await import('@/components/round-planner/RoundPlannerScreen')
const { useRoundPlannerInteractions } = await import('@/hooks/use-round-planner-interactions')

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(`${TODAY}T12:00:00Z`))
  server.use(
    on('get', '/rounds/{id}/planner/occurrences/{date}', () =>
      HttpResponse.json({
        roundId: 'r1', roundName: 'Alnwick Fri', date: TODAY, stops: [],
        summary: { stopCount: 0, totalValue: 0, completedCount: 0, completionPct: 0, holdCount: 0, issueCount: 0 },
      } as never),
    ),
    http.get(mswPath('/closures'), () => HttpResponse.json({ closures: [] })),
    http.get(mswPath('/rounds/{id}/move-occurrence/preview'), () =>
      HttpResponse.json({ fromDate: TODAY, kind: 'REAL', propertyCount: 4, earliestDate: TODAY, latestDate: '2026-12-02', blockedDates: [], check: null }),
    ),
  )
})
afterEach(() => vi.useRealTimers())

const card = (over: Partial<PlannerRoundCard> = {}): PlannerRoundCard => ({
  key: 'r1:x', roundId: 'r1', roundName: 'Alnwick Fri', date: TODAY, stopCount: 4, totalValue: 80, completedCount: 0,
  holdCount: 0, issueCount: 0, status: 'not_started', technicianName: 'Sam', projected: false, ...over,
})

function renderPanel(c: PlannerRoundCard, canMutate = true) {
  return renderWithProviders(
    <RoundPlannerDetailPanel card={c} currency="GBP" canMutate={canMutate} onClose={vi.fn()} onOpenList={vi.fn()} onOpenMap={vi.fn()} />,
  )
}

describe('Move date on a real date (detail panel)', () => {
  it('shows for today and opens the move dialog', async () => {
    const { user } = renderPanel(card())
    await user.click(screen.getByRole('button', { name: 'Move date' }))
    expect(await screen.findByText('4 properties will move')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByText('4 properties will move')).not.toBeInTheDocument()
  })

  it('shows for a future date', () => {
    renderPanel(card({ date: '2026-12-02' }))
    expect(screen.getByRole('button', { name: 'Move date' })).toBeInTheDocument()
  })

  it('is hidden for a past date', () => {
    renderPanel(card({ date: '2026-11-24' }))
    expect(screen.queryByRole('button', { name: 'Move date' })).not.toBeInTheDocument()
  })

  it('is hidden from read-only users', () => {
    renderPanel(card(), false)
    expect(screen.queryByRole('button', { name: 'Move date' })).not.toBeInTheDocument()
  })
})

describe('Move date on a forecast date (calendar)', () => {
  const week = ['2026-11-23', '2026-11-24', '2026-11-25', '2026-11-26', '2026-11-27', '2026-11-28', '2026-11-29']

  function renderCalendar(
    cards: PlannerRoundCard[],
    props: { canMoveCard?: (c: PlannerRoundCard) => boolean; onMoveCard?: (c: PlannerRoundCard) => void },
  ) {
    const cardsByDate = new Map<string, PlannerRoundCard[]>()
    for (const c of cards) cardsByDate.set(c.date, [...(cardsByDate.get(c.date) ?? []), c])
    return renderWithProviders(
      <RoundPlannerCalendar
        weeks={[{ id: 'w', dates: week }]} cardsByDate={cardsByDate} dayHeaders={['M', 'T', 'W', 'T', 'F', 'S', 'S']}
        emptyLabel="No rounds" stopsLabel="stops" unassignedLabel="Unassigned" today={TODAY} currency="GBP" loading={false}
        onSelectCard={vi.fn()} assignLabel="Assign" {...props}
      />,
    )
  }

  it('offers it only on cards the planner says can move', async () => {
    const onMoveCard = vi.fn()
    const next = card({ key: 'a', date: '2026-11-26', projected: true })
    const later = card({ key: 'b', date: '2026-11-28', projected: true })
    const { user } = renderCalendar([next, later], { canMoveCard: (c) => c.key === 'a', onMoveCard })
    const buttons = screen.getAllByRole('button', { name: 'Move date' })
    expect(buttons).toHaveLength(1)
    await user.click(buttons[0])
    expect(onMoveCard).toHaveBeenCalledWith(next)
  })

  it('shows nothing without a move handler', () => {
    renderCalendar([card({ projected: true })], { canMoveCard: () => true })
    expect(screen.queryByRole('button', { name: 'Move date' })).not.toBeInTheDocument()
  })
})

describe('Round Planner wiring', () => {
  const projected = (date: string) => ({
    date, stopCount: 6, totalValue: 120, completedCount: 0, completionPct: 0, holdCount: 0, issueCount: 0, technicians: [], projected: true,
  })

  function renderScreen() {
    const { result } = renderHook(() => useRoundPlannerInteractions())
    act(() => result.current.setPeriod('week'))
    act(() => result.current.setAnchorDate(TODAY))
    return renderWithProviders(<RoundPlannerScreen interactions={result.current} />)
  }

  it('the next forecast date of a round can be moved, later ones cannot', async () => {
    mocks.occurrences = [projected('2026-11-26'), projected('2026-11-28')]
    const { user } = renderScreen()
    const buttons = screen.getAllByRole('button', { name: 'Move date' })
    expect(buttons).toHaveLength(1)
    await user.click(buttons[0])
    expect(await screen.findByText('4 properties will move')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByText('4 properties will move')).not.toBeInTheDocument()
  })

  it('read-only users get no move action on forecasts', () => {
    setBootstrap({ canMutate: false, role: 'TECHNICIAN' })
    mocks.occurrences = [projected('2026-11-26')]
    renderScreen()
    expect(screen.queryByRole('button', { name: 'Move date' })).not.toBeInTheDocument()
  })
})
