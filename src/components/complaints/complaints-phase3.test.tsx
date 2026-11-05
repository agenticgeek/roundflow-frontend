import { describe, expect, it, vi } from 'vitest'
import { act, screen } from '@testing-library/react'
import { complaintsApi } from '@/api/complaints.api'
import { AssignTechnicianModal } from '@/components/complaints/AssignTechnicianModal'
import { LogComplaintModal } from '@/components/complaints/LogComplaintModal'
import { ResolveComplaintModal } from '@/components/complaints/ResolveComplaintModal'
import { useResolveComplaint, useScheduleComplaintRevisit } from '@/features/complaints/hooks/useComplaints'
import { queryKeys } from '@/lib/query-keys'
import { server } from '@/test/msw/server'
import { on, specJson } from '@/test/msw/typed'
import { technicianFixture } from '@/test/msw/handlers/technicians'
import { renderWithProviders } from '@/test/render'

const complaint = {
  id: 'cp1',
  status: 'RESOLVED' as const,
  severity: 'MEDIUM' as const,
  title: 'Streaky',
  customerId: 'c1',
  customerName: 'Jo',
  messageCount: 0,
  createdAt: '2026-10-20T09:00:00Z',
}

function useTeam() {
  server.use(
    on('get', '/technicians', () =>
      specJson('/technicians', 'get', 200, [
        technicianFixture({ id: 't1', name: 'Sam' }),
        technicianFixture({ id: 't2', name: 'Alex', appStatus: 'PENDING_INVITE' }),
      ]),
    ),
  )
}

describe('complaints API (GAP-025 / GAP-029)', () => {
  it('resolve sends notes + upheld; schedule-revisit returns the visit id', async () => {
    const bodies: unknown[] = []
    server.use(
      on('post', '/complaints/{id}/resolve', async ({ request }) => {
        bodies.push(await request.json())
        return specJson('/complaints/{id}/resolve', 'post', 200, { ...complaint, upheld: true })
      }),
      on('post', '/complaints/{id}/schedule-revisit', async ({ request }) => {
        bodies.push(await request.json())
        return specJson('/complaints/{id}/schedule-revisit', 'post', 200, {
          ...complaint,
          status: 'REVISIT_BOOKED',
          visitId: 'v9',
        })
      }),
    )
    expect((await complaintsApi.resolve('cp1', { notes: 'Fixed', upheld: true })).upheld).toBe(true)
    await complaintsApi.resolve('cp1')
    expect((await complaintsApi.scheduleRevisit('cp1', '2026-11-06')).visitId).toBe('v9')
    expect(bodies).toEqual([{ notes: 'Fixed', upheld: true }, {}, { revisitDate: '2026-11-06' }])
  })

  it('hooks refresh the planner (revisit) and the technician KPIs (resolve)', async () => {
    server.use(
      on('post', '/complaints/{id}/resolve', () => specJson('/complaints/{id}/resolve', 'post', 200, complaint)),
      on('post', '/complaints/{id}/schedule-revisit', () =>
        specJson('/complaints/{id}/schedule-revisit', 'post', 200, { ...complaint, visitId: null }),
      ),
    )
    let resolve: ReturnType<typeof useResolveComplaint> | undefined
    let revisit: ReturnType<typeof useScheduleComplaintRevisit> | undefined
    function Harness() {
      resolve = useResolveComplaint()
      revisit = useScheduleComplaintRevisit()
      return null
    }
    const { queryClient } = renderWithProviders(<Harness />)
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
    await act(() => resolve!.mutateAsync({ id: 'cp1', upheld: false }))
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.dashboard.all })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.technicians.all })
    await act(() => revisit!.mutateAsync({ id: 'cp1', revisitDate: '2026-11-06' }))
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.rounds.all })
  })
})

describe('complaint modals', () => {
  it('ResolveComplaintModal sends the upheld toggle and resets on reopen', async () => {
    const onConfirm = vi.fn()
    const { user, rerender } = renderWithProviders(
      <ResolveComplaintModal open onClose={vi.fn()} onConfirm={onConfirm} />,
    )
    await user.type(screen.getByPlaceholderText(/Revisited and re-cleaned/), ' Re-cleaned ')
    await user.click(screen.getByRole('switch', { name: 'Upheld' }))
    await user.click(screen.getByRole('button', { name: 'Mark as Resolved' }))
    expect(onConfirm).toHaveBeenCalledWith('Re-cleaned', true)
    rerender(<ResolveComplaintModal open={false} onClose={vi.fn()} onConfirm={onConfirm} />)
    rerender(<ResolveComplaintModal open onClose={vi.fn()} onConfirm={onConfirm} />)
    expect(screen.getByRole('switch', { name: 'Upheld' })).toHaveAttribute('aria-checked', 'false')
  })

  it('LogComplaintModal lists pending-invite technicians (GAP-029 part 2)', async () => {
    useTeam()
    const { user } = renderWithProviders(<LogComplaintModal open onClose={vi.fn()} onSubmit={vi.fn()} />)
    await user.click(await screen.findByRole('button', { name: 'Technician involved (optional)' }))
    expect(await screen.findByRole('option', { name: 'Alex (invite pending)' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Sam' })).toBeInTheDocument()
  })

  it('LogComplaintModal explains an empty team', async () => {
    renderWithProviders(<LogComplaintModal open onClose={vi.fn()} onSubmit={vi.fn()} />)
    expect(await screen.findByText('No technicians yet — add them on the Technicians page.')).toBeInTheDocument()
  })

  it('AssignTechnicianModal flags pending invites and can assign them', async () => {
    useTeam()
    const onAssign = vi.fn()
    const { user } = renderWithProviders(
      <AssignTechnicianModal open currentTechnicianId={null} onClose={vi.fn()} onAssign={onAssign} />,
    )
    expect(await screen.findByText(/· \(invite pending\)/)).toBeInTheDocument()
    await user.click(screen.getByText('Alex'))
    await user.click(screen.getByRole('button', { name: 'Assign' }))
    expect(onAssign).toHaveBeenCalledWith('t2')
  })
})
