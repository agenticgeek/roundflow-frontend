import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import { HttpResponse } from 'msw'
import { ApiError } from '@/lib/errors'
import { technicianListItem } from '@/test/fixtures'
import { server } from '@/test/msw/server'
import { on } from '@/test/msw/typed'
import { renderWithProviders } from '@/test/render'

const mocks = vi.hoisted(() => ({
  setTechnicians: vi.fn(),
  createRound: vi.fn(),
  updateRound: vi.fn(),
  generateVisits: vi.fn(),
  refetchDetails: vi.fn(),
}))

const round = {
  id: 'r1',
  name: 'Alnwick Fri',
  status: 'ACTIVE',
  serviceAreaId: 'a1',
  serviceAreaName: 'Alnwick',
  frequency: 'FOUR_WEEKLY',
  defaultDay: 'FRI',
}
const active = technicianListItem({ id: 't1', name: 'Sam' })
const pending = technicianListItem({ id: 't2', name: 'Alex', appStatus: 'PENDING_INVITE', email: 'alex@example.com' })

vi.mock('@/features/rounds/hooks/useRounds', () => ({
  useRounds: () => ({ data: [round], isPending: false, isError: false, isSuccess: true, refetch: vi.fn() }),
  useRoundDetails: () => ({ byRoundId: new Map([['r1', { technicians: [] }]]), refetch: mocks.refetchDetails }),
  useRoundsOccurrences: () => ({ byRoundId: new Map([['r1', [{ date: '2026-11-06', stopCount: 3 }]]]) }),
  useRoundOccurrenceDay: () => ({ isPending: false, data: undefined }),
  useSetRoundTechnicians: () => ({ mutateAsync: mocks.setTechnicians, isPending: false }),
  useCreateRound: () => ({ mutateAsync: mocks.createRound, isPending: false }),
  useUpdateRound: () => ({ mutateAsync: mocks.updateRound, isPending: false }),
  useGenerateRoundVisits: () => ({ mutateAsync: mocks.generateVisits, isPending: false }),
}))
vi.mock('@/features/rounds/hooks/useUnassignedRoundsAlert', () => ({ useUnassignedRoundsAlert: () => null }))
vi.mock('@/features/technicians/hooks/useTechnicians', () => ({
  useTechniciansList: () => ({ data: [active, pending], isPending: false, isError: false }),
}))

const { AssignTechniciansScreen } = await import('@/components/round-planner/AssignTechniciansScreen')
const { AssignRoundTechnicianModal } = await import('@/components/round-planner/AssignRoundTechnicianModal')
const { CreateRoundModal } = await import('@/components/round-planner/CreateRoundModal')

const pendingError = new ApiError(400, 'Cannot assign technician(s) with a pending invite: Alex')

beforeEach(() => {
  Object.values(mocks).forEach((mock) => mock.mockReset())
  server.use(
    on('get', '/settings/service-areas', () => HttpResponse.json([{ id: 'a1', name: 'Alnwick' }])),
    on('get', '/settings/technicians', () =>
      HttpResponse.json([
        { id: 't1', name: 'Sam', displayName: 'Sam', appStatus: 'ACTIVE', active: true },
        { id: 't2', name: 'Alex', displayName: 'Alex', appStatus: 'PENDING_INVITE', active: true },
      ]),
    ),
  )
})

describe('Assign technicians wizard (GAP-011)', () => {
  it('flags pending invites and keeps Review open with the server error', async () => {
    mocks.setTechnicians.mockRejectedValue(pendingError)
    const { user } = renderWithProviders(<AssignTechniciansScreen />)

    expect(screen.getByText('Invite pending')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Resend invite' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Alex' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Sam' }))
    await user.click(screen.getByRole('button', { name: /Continue/ }))
    await user.click(screen.getByRole('button', { name: /Continue/ }))
    await user.click(screen.getByRole('button', { name: 'Save assignments' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Alnwick Fri: Cannot assign technician(s) with a pending invite: Alex',
    )
    expect(screen.getByRole('heading', { name: 'Check and save' })).toBeInTheDocument()
    expect(mocks.refetchDetails).toHaveBeenCalled()
  })
})

describe('Assignment result (FLOW-02)', () => {
  async function saveSam() {
    const utils = renderWithProviders(<AssignTechniciansScreen />)
    const { user } = utils
    await user.click(screen.getByRole('button', { name: 'Sam' }))
    await user.click(screen.getByRole('button', { name: /Continue/ }))
    await user.click(screen.getByRole('button', { name: /Continue/ }))
    await user.click(screen.getByRole('button', { name: 'Save assignments' }))
    return utils
  }

  it('shows visits updated, generated, the next visit date and the hand-assigned count', async () => {
    mocks.setTechnicians.mockResolvedValue({
      roundId: 'r1', allocation: [], visitsUpdated: 4, visitsGenerated: 3, overriddenVisits: 1, nextVisitDate: '2026-11-09',
    })
    await saveSam()
    const summary = await screen.findByRole('status', { name: 'What this did to the visits' })
    expect(within(summary).getByText('Alnwick Fri')).toBeInTheDocument()
    expect(within(summary).getByText('4 upcoming visits now have this technician.')).toBeInTheDocument()
    expect(within(summary).getByText('3 new visits were created.')).toBeInTheDocument()
    expect(within(summary).getByText('Next visit: Mon 9 Nov 2026.')).toBeInTheDocument()
    expect(within(summary).getByText('1 visit you assigned by hand was left as it is.')).toBeInTheDocument()
    expect(within(summary).queryByText(/No visits exist yet/)).not.toBeInTheDocument()
    expect(screen.getByText('4 visits updated, 3 created.')).toBeInTheDocument()
  })

  it('warns clearly when nothing was updated or created, naming the next visit date', async () => {
    mocks.setTechnicians.mockResolvedValue({
      roundId: 'r1', allocation: [], visitsUpdated: 0, visitsGenerated: 0, overriddenVisits: 0, nextVisitDate: '2026-11-13',
    })
    await saveSam()
    const summary = await screen.findByRole('status', { name: 'What this did to the visits' })
    const warning =
      'No visits exist yet for this round, so nothing shows in the technician’s app until the next visit is generated on Fri 13 Nov 2026.'
    expect(within(summary).getByText(warning)).toBeInTheDocument()
    // The toast carries it too.
    expect(screen.getAllByText(warning)).toHaveLength(2)
  })

  it('still warns against an older backend that returns only visitsUpdated', async () => {
    mocks.setTechnicians.mockResolvedValue({ roundId: 'r1', allocation: [], visitsUpdated: 0 }) // older backend: no newer fields
    await saveSam()
    const summary = await screen.findByRole('status', { name: 'What this did to the visits' })
    expect(within(summary).getByText(/none are due to be generated/)).toBeInTheDocument()
  })
})

describe('Quick assign modal (GAP-011)', () => {
  const target = { round, date: '2026-11-06', stopCount: 3 }

  it('FLOW-02: the toast says what happened to the visits', async () => {
    mocks.setTechnicians.mockResolvedValue({
      roundId: 'r1', allocation: [], visitsUpdated: 0, visitsGenerated: 0, overriddenVisits: 0, nextVisitDate: '2026-11-13',
    })
    const onClose = vi.fn()
    const { user } = renderWithProviders(<AssignRoundTechnicianModal target={target} onClose={onClose} />)
    await user.click(within(screen.getByRole('group')).getByRole('checkbox', { name: /Sam/ }))
    await user.click(screen.getByRole('button', { name: 'Assign' }))
    expect(await screen.findByText('Sam assigned to Alnwick Fri')).toBeInTheDocument()
    expect(screen.getByText(/No visits exist yet for this round/)).toBeInTheDocument()
    expect(onClose).toHaveBeenCalled()
  })

  it('disables pending technicians and shows the server error', async () => {
    mocks.setTechnicians.mockRejectedValue(pendingError)
    const { user } = renderWithProviders(<AssignRoundTechnicianModal target={target} onClose={vi.fn()} />)
    const group = screen.getByRole('group')
    expect(within(group).getByRole('checkbox', { name: /Alex/ })).toBeDisabled()
    await user.click(within(group).getByRole('checkbox', { name: /Sam/ }))
    await user.click(screen.getByRole('button', { name: 'Assign' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('pending invite: Alex')
  })
})

describe('Create round (GAP-011)', () => {
  async function walkToReview() {
    const utils = renderWithProviders(<CreateRoundModal open onClose={vi.fn()} />)
    const { user } = utils
    await user.type(screen.getByPlaceholderText('Round name'), 'Amble Mon')
    await user.click(screen.getByRole('button', { name: /Continue/ }))
    await user.click(await screen.findByRole('button', { name: /Alnwick/ }))
    await user.click(screen.getByRole('button', { name: /Continue/ }))
    await user.click(screen.getByRole('button', { name: /Continue/ }))
    expect(await screen.findByText('Invite pending')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Alex/ })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: /Sam/ }))
    await user.click(screen.getByRole('button', { name: /Continue/ }))
    return utils
  }

  it('rolls the round back when the technician can’t be assigned, and stays on Review', async () => {
    mocks.createRound.mockResolvedValue({ id: 'r9' })
    mocks.setTechnicians.mockRejectedValue(pendingError)
    mocks.updateRound.mockResolvedValue({})
    const { user } = await walkToReview()
    await user.click(screen.getByRole('button', { name: 'Save Round' }))

    expect(await screen.findByText('Cannot assign technician(s) with a pending invite: Alex')).toBeInTheDocument()
    expect(mocks.setTechnicians).toHaveBeenCalledWith({ id: 'r9', input: { technicianIds: ['t1'], split: { mode: 'SINGLE' } } })
    expect(mocks.updateRound).toHaveBeenCalledWith({ id: 'r9', input: { status: 'ARCHIVED' } })
    expect(screen.getByText('Round summary')).toBeInTheDocument()
  })
})
