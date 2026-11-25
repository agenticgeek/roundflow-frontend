import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import { server } from '@/test/msw/server'
import { API } from '@/test/msw/typed'
import { renderWithProviders } from '@/test/render'
import { setBootstrap } from '@/test/bootstrap'

const mocks = vi.hoisted(() => ({
  rounds: [] as { id: string; name: string; status: string }[],
}))

vi.mock('@/components/round-planner/RoundPlannerMapSection', () => ({ RoundPlannerMapSection: () => null }))
vi.mock('@/features/rounds/hooks/useUnassignedRoundsAlert', () => ({ useUnassignedRoundsAlert: () => null }))
const fanOut = { byRoundId: new Map(), isLoading: false, isFetching: false, isError: false, error: undefined, refetch: vi.fn() }
vi.mock('@/features/rounds/hooks/useRounds', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/rounds/hooks/useRounds')>()),
  useRounds: () => ({
    data: mocks.rounds,
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
vi.mock('@/features/settings/hooks/useSettings', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/settings/hooks/useSettings')>()),
  useRoundSettings: () => ({ data: { currency: 'GBP', defaultCycleLength: 28 } }),
}))
vi.mock('@/features/technicians/hooks/useTechnicians', () => ({
  useTechniciansList: () => ({ data: [] }),
}))
vi.mock('@/features/closures/hooks/useClosures', () => ({ useClosures: () => ({ data: undefined }) }))

const { RoundPlannerScreen } = await import('@/components/round-planner/RoundPlannerScreen')
const { useRoundPlannerInteractions } = await import('@/hooks/use-round-planner-interactions')

function Planner({ round }: { round?: string }) {
  const interactions = useRoundPlannerInteractions(round ? { round } : {})
  return <RoundPlannerScreen interactions={interactions} />
}

beforeEach(() => {
  mocks.rounds = [
    { id: 'r1', name: 'Alnwick Fri', status: 'ACTIVE' },
    { id: 'r2', name: 'Amble Mon', status: 'ACTIVE' },
  ]
  server.use(
    http.get(`${API}/rounds/r1`, () =>
      HttpResponse.json({
        id: 'r1',
        name: 'Alnwick Fri',
        frequency: 'FOUR_WEEKLY',
        defaultDay: 'FRI',
        description: null,
        status: 'ACTIVE',
        serviceAreaId: 'a1',
        serviceAreaName: 'Alnwick',
        technicians: [],
        propertyCount: 2,
      }),
    ),
    http.get(`${API}/settings/service-areas`, () => HttpResponse.json([{ id: 'a1', name: 'Alnwick', postcodeSector: '' }])),
    http.get(`${API}/rounds/r1/delete-preview`, () =>
      HttpResponse.json({
        propertyCount: 2,
        upcomingVisitCount: 6,
        detachedVisitCount: 0,
        emergencyCount: 0,
        attachedVisitCount: 0,
        canDelete: true,
      }),
    ),
    http.delete(`${API}/rounds/r1`, () => {
      mocks.rounds = mocks.rounds.filter((round) => round.id !== 'r1')
      return HttpResponse.json({ deleted: true, unassignedProperties: 2, deletedVisits: 6, detachedVisits: 0 })
    }),
  )
})

describe('Round Planner — edit and delete the selected round', () => {
  it('offers edit and delete only once a single round is picked', () => {
    renderWithProviders(<Planner />)
    expect(screen.queryByRole('button', { name: 'Edit round' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Delete round' })).not.toBeInTheDocument()
  })

  it('hides both for users who can’t make changes', () => {
    setBootstrap({ canMutate: false, role: 'TECHNICIAN' })
    renderWithProviders(<Planner round="r1" />)
    expect(screen.queryByRole('button', { name: 'Edit round' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Delete round' })).not.toBeInTheDocument()
  })

  it('opens the edit form prefilled for the selected round', async () => {
    const { user } = renderWithProviders(<Planner round="r1" />)
    await user.click(screen.getByRole('button', { name: 'Edit round' }))
    expect(await screen.findByDisplayValue('Alnwick Fri')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(screen.queryByDisplayValue('Alnwick Fri')).not.toBeInTheDocument())
  })

  it('deletes the round and falls back to all rounds', async () => {
    const { user } = renderWithProviders(<Planner round="r1" />)
    expect(screen.getByRole('button', { name: 'Round' })).toHaveTextContent('Alnwick Fri')
    await user.click(screen.getByRole('button', { name: 'Delete round' }))
    const dialog = await screen.findByRole('alertdialog')
    await within(dialog).findByText('2 properties will be unassigned and 6 upcoming visits removed. Completed visits are kept.')
    await user.click(within(dialog).getByRole('button', { name: 'Delete round' }))
    expect(await screen.findByText('Round deleted')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Round' })).toHaveTextContent('All rounds'))
    expect(screen.queryByRole('button', { name: 'Edit round' })).not.toBeInTheDocument()
  })
})
