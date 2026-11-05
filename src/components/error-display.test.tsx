import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { ApiError } from '@/lib/errors'
import { technicianListItem } from '@/test/fixtures'
import { renderWithProviders } from '@/test/render'

const mocks = vi.hoisted(() => ({
  reassignEmergency: vi.fn(),
  reassignRound: vi.fn(),
  technicians: [] as unknown[],
  settingsTechnicians: [] as unknown[],
}))

vi.mock('@/features/emergencies/hooks/useEmergencies', () => ({
  useEmergency: () => ({
    isLoading: false,
    data: {
      id: 'e1',
      technicianId: 't1',
      technicianName: 'Sam',
      roundId: 'r1',
      roundName: 'Alnwick Fri',
      remainingStops: 4,
      lastLocation: null,
      scheduledWindowEnd: null,
      notes: null,
      status: 'ACTIVE',
      assignedTechnicianId: null,
      assignedTechnicianName: null,
      resolvedAt: null,
      reportedAt: '2026-10-30T09:00:00Z',
    },
  }),
  useEmergencyAvailableTechnicians: () => ({
    isLoading: false,
    data: [{ technicianId: 't2', technicianName: 'Alex', avatarUrl: null, jobsRemaining: 2, availability: 'AVAILABLE' }],
  }),
  useReassignEmergency: () => ({ mutateAsync: mocks.reassignEmergency, isPending: false }),
}))
vi.mock('@/features/technicians/hooks/useTechnicians', () => ({
  useTechniciansList: () => ({ data: mocks.technicians, isPending: false }),
}))
vi.mock('@/features/customers/hooks/useCustomers', () => ({
  useCustomers: () => ({ data: undefined, isFetching: false }),
}))
vi.mock('@/features/today/hooks/useToday', () => ({
  useReassignRoundTechnician: () => ({ mutateAsync: mocks.reassignRound, isPending: false }),
  useRoundToday: () => ({ data: undefined }),
}))
vi.mock('@/features/settings/hooks/useSettings', () => ({
  useTechnicians: () => ({ data: mocks.settingsTechnicians }),
}))

const { EmergencyDetailPanel } = await import('@/components/emergencies/EmergencyDetailPanel')
const { LogComplaintModal } = await import('@/components/complaints/LogComplaintModal')
const { AssignTechnicianModal } = await import('@/components/complaints/AssignTechnicianModal')
const { ReassignTechnicianModal } = await import('@/components/todays-work/ReassignTechnicianModal')

beforeEach(() => {
  mocks.reassignEmergency.mockReset()
  mocks.technicians = [technicianListItem({ appStatus: 'PENDING_INVITE' })]
})

describe('Error-display rule: the server’s message reaches the user', () => {
  it.each([
    [new ApiError(409, 'Emergency already resolved by Jo'), 'Emergency already resolved by Jo'],
    [new ApiError(404, 'Emergency not found'), 'Emergency not found'],
    [new ApiError(409, ''), 'This emergency has already been resolved.'],
    [new ApiError(500, 'Database timeout'), 'Database timeout'],
  ])('emergency reassign %#', async (error, shown) => {
    mocks.reassignEmergency.mockRejectedValue(error)
    const { user } = renderWithProviders(<EmergencyDetailPanel emergencyId="e1" onClose={vi.fn()} />)
    await user.click(screen.getByRole('radio', { name: /Alex/ }))
    await user.click(screen.getByRole('button', { name: 'Confirm reassignment' }))
    expect(await screen.findByText(shown)).toBeInTheDocument()
  })
})

describe('GAP-029: empty technician lists explain themselves', () => {
  // Pending invites are selectable since GAP-029 part 2, so only an empty team gets the hint.
  const noTechnicians = 'No technicians yet — add them on the Technicians page.'

  it('Log complaint says the team is empty', () => {
    mocks.technicians = []
    renderWithProviders(<LogComplaintModal open onClose={vi.fn()} onSubmit={vi.fn()} />)
    expect(screen.getByText(noTechnicians)).toBeInTheDocument()
  })

  it('Assign technician says so too', () => {
    mocks.technicians = []
    renderWithProviders(<AssignTechnicianModal open currentTechnicianId={null} onClose={vi.fn()} onAssign={vi.fn()} />)
    expect(screen.getByText(noTechnicians)).toBeInTheDocument()
  })
})

describe('GAP-013: reassign without a technician explains why', () => {
  const round = {
      id: 'r1',
      status: 'scheduled' as const,
      round: 'Alnwick Fri',
      technician: 'Unassigned',
      technicianId: null,
      technicianInitial: '?',
      progressCompleted: 0,
      progressTotal: 4,
      completed: 0,
      skipped: 0,
      issues: 0,
      paymentHolds: 0,
      value: '£80',
      eta: '—',
      jobs: [],
    }

  it('GAP-013 part 2: no technician means the day’s unassigned visits move (no dead end)', () => {
    renderWithProviders(<ReassignTechnicianModal open round={round} onClose={vi.fn()} />)
    expect(screen.getByText(/No technician is on these visits yet/)).toBeInTheDocument()
    expect(screen.queryByText('No technician assigned yet')).not.toBeInTheDocument()
  })

  it('reassigns normally once the round has a technician', async () => {
    mocks.settingsTechnicians = [
      { id: 't1', name: 'Sam', displayName: 'Sam', appStatus: 'ACTIVE', active: true },
      { id: 't2', name: 'Alex', displayName: 'Alex', appStatus: 'ACTIVE', active: true },
    ]
    mocks.reassignRound.mockResolvedValue({ updated: 2 })
    const onClose = vi.fn()
    const { user } = renderWithProviders(
      <ReassignTechnicianModal open round={{ ...round, technician: 'Sam', technicianId: 't1' }} onClose={onClose} />,
    )
    expect(screen.queryByText('No technician assigned yet')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Select Technician' }))
    await user.click(screen.getByRole('option', { name: 'Alex' }))
    await user.click(screen.getByRole('button', { name: 'Reassign Jobs' }))
    expect(mocks.reassignRound).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'r1', input: expect.objectContaining({ fromTechnicianId: 't1', toTechnicianId: 't2' }) }),
    )
    expect(onClose).toHaveBeenCalled()
  })
})
