import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useState } from 'react'
import { screen, waitFor, within } from '@testing-library/react'
import { HttpResponse } from 'msw'
import type { RoundListItem } from '@/api/rounds.api'
import type { RoundSplit } from '@/features/rounds/lib/split'
import { technicianListItem } from '@/test/fixtures'
import { server } from '@/test/msw/server'
import { apiError, on, specJson } from '@/test/msw/typed'
import { renderWithProviders } from '@/test/render'

const mocks = vi.hoisted(() => ({ setTechnicians: vi.fn(), refetchDetails: vi.fn() }))

const round = {
  id: 'r1',
  name: 'Alnwick Fri',
  status: 'ACTIVE',
  serviceAreaId: 'a1',
  serviceAreaName: 'Alnwick',
  frequency: 'FOUR_WEEKLY',
  defaultDay: 'FRI',
  technicianCount: 0,
  propertyCount: 2,
} as RoundListItem

vi.mock('@/features/rounds/hooks/useRounds', () => ({
  useRounds: () => ({ data: [round], isPending: false, isError: false, isSuccess: true, refetch: vi.fn() }),
  useRoundDetails: () => ({ byRoundId: new Map([['r1', { technicians: [] }]]), refetch: mocks.refetchDetails }),
  useRoundsOccurrences: () => ({ byRoundId: new Map([['r1', [{ date: '2026-11-06', stopCount: 2 }]]]) }),
  useSetRoundTechnicians: () => ({ mutateAsync: mocks.setTechnicians, isPending: false }),
}))
vi.mock('@/features/rounds/hooks/useUnassignedRoundsAlert', () => ({ useUnassignedRoundsAlert: () => null }))
vi.mock('@/features/technicians/hooks/useTechnicians', () => ({
  useTechniciansList: () => ({
    data: [technicianListItem({ id: 't1', name: 'Sam' }), technicianListItem({ id: 't3', name: 'Alex' })],
    isPending: false,
    isError: false,
  }),
}))

const { AssignTechniciansScreen } = await import('@/components/round-planner/AssignTechniciansScreen')
const { RoundSplitCard } = await import('@/components/round-planner/RoundSplitCard')

const customersPage = {
  customers: [
    { customerId: 'c1', customerName: 'Jo Coates', propertyId: 'p1', addressLine: '4 Hotspur Street', price: 20 },
    { customerId: 'c2', customerName: 'Al Reed', propertyId: 'p2', addressLine: '9 Bondgate', price: 15 },
  ],
}

let dryRunBodies: unknown[]

function useSplitHandlers({ savedMode = 'MANUAL' as 'SINGLE' | 'AUTO' | 'MANUAL' } = {}) {
  server.use(
    on('get', '/settings/service-areas', () => HttpResponse.json([{ id: 'a1', name: 'Alnwick' }])),
    on('get', '/rounds/{id}/allocation', () =>
      specJson('/rounds/{id}/allocation', 'get', 200, {
        mode: savedMode,
        allocation: [
          { technicianId: 't1', name: 'Sam', propertyIds: ['p1'], stops: 1, value: '20.00' },
          { technicianId: 'gone', name: 'Old', propertyIds: ['p2'], stops: 1, value: '15.00' },
        ],
      }),
    ),
    on('get', '/customers', ({ request }) => {
      expect(new URL(request.url).searchParams.get('roundId')).toBe('r1')
      return specJson('/customers', 'get', 200, customersPage)
    }),
    on('put', '/rounds/{id}/technicians', async ({ request }) => {
      expect(new URL(request.url).searchParams.get('dryRun')).toBe('true')
      dryRunBodies.push(await request.json())
      return specJson('/rounds/{id}/technicians', 'put', 200, {
        roundId: 'r1',
        allocation: [
          { technicianId: 't1', name: 'Sam', propertyIds: ['p1'], stops: 1, value: '20.00' },
          { technicianId: 't3', name: null, propertyIds: ['p2'], stops: 1, value: '15.00' },
        ],
        visitsUpdated: 6,
      })
    }),
  )
}

beforeEach(() => {
  dryRunBodies = []
  mocks.setTechnicians.mockReset()
})

async function openSplitStep() {
  const utils = renderWithProviders(<AssignTechniciansScreen />)
  await utils.user.click(screen.getByRole('button', { name: 'Sam' }))
  await utils.user.click(screen.getByRole('button', { name: 'Alex' }))
  await utils.user.click(screen.getByRole('button', { name: /Continue/ }))
  return utils
}

describe('Assign wizard split (GAP-012)', () => {
  it('prefills MANUAL from the saved allocation, balances, previews AUTO and saves SINGLE', async () => {
    useSplitHandlers()
    mocks.setTechnicians.mockResolvedValue({ roundId: 'r1', allocation: [], visitsUpdated: 2 })
    const { user } = await openSplitStep()

    expect(await screen.findByRole('radio', { name: /Choose per property/ })).toHaveAttribute('aria-checked', 'true')
    expect(screen.queryByText(/split is a guide/)).not.toBeInTheDocument()
    expect(screen.getByText(/only sees their own properties/)).toBeInTheDocument()
    expect(await screen.findByText('4 Hotspur Street')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Technician: 4 Hotspur Street' })).toHaveTextContent('Sam')
    expect(screen.getByRole('button', { name: 'Technician: 9 Bondgate' })).toHaveTextContent('Choose technician')
    expect(screen.getByText('1 property still needs a technician.')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Technician: 9 Bondgate' }))
    await user.click(screen.getByRole('option', { name: 'Alex' }))
    expect(screen.queryByText(/still needs a technician/)).not.toBeInTheDocument()
    const balance = screen.getByText('Balance').parentElement!
    expect(within(balance).getByText(/1 stops · £15.00/)).toBeInTheDocument()

    await user.click(screen.getByRole('radio', { name: /Split automatically/ }))
    expect(await screen.findByText('6 upcoming visits will follow this split.')).toBeInTheDocument()
    // `name: null` falls back to the wizard's technician list.
    expect(screen.getAllByText('Alex').length).toBeGreaterThan(0)
    expect(dryRunBodies).toContainEqual({ technicianIds: ['t1', 't3'], split: { mode: 'AUTO' } })

    await user.click(screen.getByRole('radio', { name: /One technician does all jobs/ }))
    await user.click(screen.getByRole('button', { name: 'Who does all the jobs?' }))
    await user.click(screen.getByRole('option', { name: 'Alex' }))
    await user.click(screen.getByRole('button', { name: /Continue/ }))

    expect(screen.getByRole('heading', { name: 'Check and save' })).toBeInTheDocument()
    expect(screen.getByText('One does all jobs')).toBeInTheDocument()
    expect(await screen.findByText('6 upcoming visits will follow this split.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Save assignments' }))
    await waitFor(() =>
      expect(mocks.setTechnicians).toHaveBeenCalledWith({ id: 'r1', input: { technicianIds: ['t3'], split: { mode: 'SINGLE' } } }),
    )
    expect(await screen.findByText('Technicians assigned')).toBeInTheDocument()
  })

  it('saves a MANUAL split with per-property allocations', async () => {
    useSplitHandlers()
    mocks.setTechnicians.mockResolvedValue({ roundId: 'r1', allocation: [], visitsUpdated: 2 })
    const { user } = await openSplitStep()
    await user.click(await screen.findByRole('button', { name: 'Technician: 9 Bondgate' }))
    await user.click(screen.getByRole('option', { name: 'Alex' }))
    await user.click(screen.getByRole('button', { name: /Continue/ }))
    expect(screen.getByText('Chosen per property')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Save assignments' }))
    await waitFor(() =>
      expect(mocks.setTechnicians).toHaveBeenCalledWith({
        id: 'r1',
        input: {
          technicianIds: ['t1', 't3'],
          split: { mode: 'MANUAL', allocations: [{ propertyId: 'p1', technicianId: 't1' }, { propertyId: 'p2', technicianId: 't3' }] },
        },
      }),
    )
  })

  it('a saved SINGLE becomes AUTO for two technicians, and Review shows the dry-run error', async () => {
    useSplitHandlers({ savedMode: 'SINGLE' })
    const { user } = await openSplitStep()
    expect(await screen.findByRole('radio', { name: /Split automatically/ })).toHaveAttribute('aria-checked', 'true')
    server.use(on('put', '/rounds/{id}/technicians', () => apiError(400, 'Cannot assign technician(s) with a pending invite: Alex')))
    await user.click(screen.getByRole('button', { name: /Continue/ }))
    expect(screen.getByText('Split automatically', { selector: 'td' })).toBeInTheDocument()
    expect(await screen.findByText('Cannot assign technician(s) with a pending invite: Alex')).toBeInTheDocument()
  })
})

describe('RoundSplitCard states', () => {
  function Harness({ initial }: { initial?: RoundSplit }) {
    const [split, setSplit] = useState<RoundSplit | undefined>(initial)
    return <RoundSplitCard round={round} selected={['t1', 't3']} split={split} onChange={setSplit} technicianName={(id) => id} />
  }
  const manual: RoundSplit = { mode: 'MANUAL', singleId: 't1', manual: {} }

  it('shows the server error when the properties can’t load', async () => {
    server.use(on('get', '/customers', () => apiError(500, 'Customers are unavailable')))
    renderWithProviders(<Harness initial={manual} />)
    expect(screen.getByText('Loading properties…')).toBeInTheDocument()
    expect(await screen.findByText('Customers are unavailable')).toBeInTheDocument()
  })

  it('explains a round with no properties', async () => {
    server.use(on('get', '/customers', () => specJson('/customers', 'get', 200, { customers: [{ customerId: 'c9' }] })))
    renderWithProviders(<Harness initial={manual} />)
    expect(await screen.findByText('This round has no properties yet.')).toBeInTheDocument()
  })

  it('counts several unassigned properties and keeps empty fields usable', async () => {
    server.use(
      on('get', '/customers', () =>
        specJson('/customers', 'get', 200, { customers: [{ propertyId: 'p1' }, { propertyId: 'p2' }] }),
      ),
    )
    renderWithProviders(<Harness initial={manual} />)
    expect(await screen.findByText('2 properties still need a technician.')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /^Technician:/ })).toHaveLength(2)
  })

  it('prefills the default split when there is no saved allocation', async () => {
    server.use(on('get', '/rounds/{id}/allocation', () => apiError(404, 'Round not found')))
    renderWithProviders(<Harness />)
    expect(document.querySelector('[aria-busy="true"]')).not.toBeNull()
    expect(await screen.findByRole('radio', { name: /Split automatically/ })).toHaveAttribute('aria-checked', 'true')
  })
})
