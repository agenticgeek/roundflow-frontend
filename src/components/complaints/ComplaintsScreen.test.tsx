import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import { renderWithProviders } from '@/test/render'

const state = vi.hoisted(() => ({
  status: 'RESOLVED' as string,
  upheld: true as boolean | null,
  resolve: vi.fn(),
  schedule: vi.fn(),
}))

const record = () => ({
  id: 'cp1',
  status: state.status,
  severity: 'MEDIUM',
  title: 'Streaky back windows',
  description: null,
  issueType: null,
  customerId: 'c1',
  customerName: 'Jo Coates',
  propertyId: 'p1',
  technicianId: null,
  revisitDate: null,
  createdAt: '2026-10-20T09:00:00Z',
})

const mutation = () => ({ mutateAsync: vi.fn(), isPending: false })

vi.mock('@/features/complaints/hooks/useComplaints', () => ({
  useComplaints: () => ({
    data: { rows: [record()], pagination: { page: 1, pageSize: 50, total: 1, totalPages: 1 } },
    isPending: false,
    isError: false,
  }),
  // GAP-029: resolvedBy is `{ id, name }`.
  useComplaint: (id: string) => ({
    data: id
      ? {
          ...record(),
          ...(state.status === 'RESOLVED'
            ? { resolvedAt: '2026-10-21T10:00:00Z', resolvedBy: { id: 'pr1', name: 'Jo Admin' }, upheld: state.upheld }
            : {}),
        }
      : undefined,
  }),
  useComplaintMessages: () => ({ data: [], isPending: false, isError: false }),
  useCreateComplaint: mutation,
  useMarkComplaintInReview: mutation,
  useScheduleComplaintRevisit: () => ({ mutateAsync: state.schedule, isPending: false }),
  useResolveComplaint: () => ({ mutateAsync: state.resolve, isPending: false }),
  useReopenComplaint: mutation,
  useAssignComplaintTechnician: mutation,
  useAddComplaintMessage: mutation,
}))
vi.mock('@/features/customers/hooks/useCustomers', () => ({
  useCustomer: () => ({ data: undefined, isPending: false }),
  useCustomers: () => ({ data: undefined }),
}))
vi.mock('@/features/technicians/hooks/useTechnicians', () => ({
  useTechniciansList: () => ({ data: [], isPending: false }),
}))

const { ComplaintsScreen } = await import('@/components/complaints/ComplaintsScreen')

beforeEach(() => {
  state.status = 'RESOLVED'
  state.upheld = true
  state.resolve.mockReset()
  state.schedule.mockReset()
})

describe('ComplaintsScreen (GAP-029 / GAP-025)', () => {
  it('names the resolver and shows the upheld outcome', async () => {
    const { user } = renderWithProviders(<ComplaintsScreen />)
    await user.click(screen.getByText('Streaky back windows'))
    expect(await screen.findByText(/Resolved by Jo Admin ·/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Details' }))
    expect(screen.getByText('Jo Admin')).toBeInTheDocument()
    expect(screen.getByText('Yes — counts as a strike')).toBeInTheDocument()
  })

  it('resolves with the upheld flag', async () => {
    state.status = 'OPEN'
    state.resolve.mockResolvedValue({})
    const { user } = renderWithProviders(<ComplaintsScreen />)
    await user.click(screen.getByText('Streaky back windows'))
    await user.click(screen.getByRole('button', { name: 'Resolve' }))
    await user.click(screen.getByRole('switch', { name: 'Upheld' }))
    await user.click(screen.getByRole('button', { name: 'Mark as Resolved' }))
    expect(state.resolve).toHaveBeenCalledWith({ id: 'cp1', notes: undefined, upheld: true })
  })

  it('shows the booked revisit with a planner link, or why no visit was made', async () => {
    state.status = 'OPEN'
    state.schedule.mockResolvedValueOnce({ visitId: 'v9' }).mockResolvedValueOnce({ visitId: null })
    const { user } = renderWithProviders(<ComplaintsScreen />)
    await user.click(screen.getByText('Streaky back windows'))

    await user.click(screen.getByRole('button', { name: 'Schedule Revisit' }))
    fireEvent.change(screen.getByLabelText('Revisit date'), { target: { value: '2026-11-06' } })
    await user.click(screen.getByRole('button', { name: 'Confirm' }))
    expect(await screen.findByText('Revisit booked')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Open round planner' })).toHaveAttribute('href', '/round-planner')
    expect(state.schedule).toHaveBeenCalledWith({ id: 'cp1', revisitDate: '2026-11-06' })

    await user.click(screen.getByRole('button', { name: 'Schedule Revisit' }))
    fireEvent.change(screen.getByLabelText('Revisit date'), { target: { value: '2026-11-07' } })
    await user.click(screen.getByRole('button', { name: 'Confirm' }))
    expect(await screen.findByText(/no property/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Dismiss' }))
    expect(screen.queryByText('Revisit booked')).not.toBeInTheDocument()
  })
})
