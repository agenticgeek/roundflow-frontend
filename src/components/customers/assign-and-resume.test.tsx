import { describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { HttpResponse } from 'msw'
import { AssignToRoundModal } from '@/components/customers/AssignToRoundModal'
import type { CustomerPropertyRecord } from '@/content/customers'
import { useResumeProperty, useUpdateProperty } from '@/features/properties/hooks/useProperties'
import { useResumeServicePlan } from '@/features/service-plans/hooks/useServicePlans'
import { queryKeys } from '@/lib/query-keys'
import { server } from '@/test/msw/server'
import { apiError, on } from '@/test/msw/typed'
import { createTestQueryClient, renderWithProviders } from '@/test/render'

const record = {
  id: 'p1',
  propertyId: 'p1',
  customer: 'Jo Coates',
  address: '4 Hotspur St',
} as CustomerPropertyRecord

function useRoundsApi() {
  server.use(
    on('get', '/rounds', () => HttpResponse.json([{ id: 'r1', name: 'Alnwick Fri' }, { id: 'r2', name: 'Amble Mon' }])),
    on('get', '/rounds/{id}', ({ params }) =>
      HttpResponse.json({ id: String(params.id), name: 'Alnwick Fri', technicians: [{ name: 'Sam', active: true }] }),
    ),
  )
}

async function pickRound(user: ReturnType<typeof renderWithProviders>['user'], name: string) {
  await user.click(screen.getAllByRole('button', { name: /Select round|Alnwick Fri|Amble Mon/ })[0]!)
  await user.click(await screen.findByRole('option', { name }))
}

describe('AssignToRoundModal (GAP-018)', () => {
  it('keeps a 409 in the modal, clears it on a new pick, then assigns', async () => {
    useRoundsApi()
    let calls = 0
    server.use(
      on('patch', '/properties/{id}', () => {
        calls += 1
        if (calls === 1) return apiError(409, 'Round Alnwick Fri is not ACTIVE')
        return HttpResponse.json({ id: 'p1', movedToRound: null })
      }),
    )
    const onClose = vi.fn()
    const { user } = renderWithProviders(<AssignToRoundModal open record={record} onClose={onClose} />)
    await pickRound(user, 'Alnwick Fri')
    await user.click(screen.getByRole('button', { name: 'Assign Property' }))
    expect(await screen.findByText('Round Alnwick Fri is not ACTIVE')).toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()

    await pickRound(user, 'Amble Mon')
    expect(screen.queryByText('Round Alnwick Fri is not ACTIVE')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Assign Property' }))
    expect(await screen.findByText('Property assigned to round')).toBeInTheDocument()
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('leaves a 400 to the global handler and toasts any other failure', async () => {
    useRoundsApi()
    let calls = 0
    server.use(
      on('patch', '/properties/{id}', () => {
        calls += 1
        return calls === 1 ? apiError(400, 'roundId is invalid') : apiError(500, 'Database timeout')
      }),
    )
    const { user } = renderWithProviders(<AssignToRoundModal open record={record} onClose={vi.fn()} />)
    await pickRound(user, 'Alnwick Fri')
    await user.click(screen.getByRole('button', { name: 'Assign Property' }))
    await waitFor(() => expect(calls).toBe(1))
    expect(screen.queryByText('roundId is invalid')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Assign Property' }))
    expect(await screen.findByText('Database timeout')).toBeInTheDocument()
  })
})

function HookProbe() {
  const update = useUpdateProperty()
  const resumeProperty = useResumeProperty()
  const resumePlan = useResumeServicePlan()
  return (
    <>
      <button type="button" onClick={() => void update.mutateAsync({ id: 'p1', input: { accessNotes: 'Gate' } })}>
        notes
      </button>
      <button type="button" onClick={() => void resumeProperty.mutateAsync('p1')}>
        resume property
      </button>
      <button type="button" onClick={() => void resumePlan.mutateAsync('sp1')}>
        resume plan
      </button>
    </>
  )
}

describe('property / plan hooks (GAP-018 / GAP-020)', () => {
  it('a plain edit refreshes customers; a resume refreshes every work view', async () => {
    server.use(
      on('patch', '/properties/{id}', () => HttpResponse.json({ id: 'p1', movedToRound: null })),
      on('post', '/properties/{id}/resume', () => HttpResponse.json({ id: 'sp1', status: 'ACTIVE' })),
      on('post', '/service-plans/{id}/resume', () => HttpResponse.json({ id: 'sp1', status: 'ACTIVE' })),
    )
    const queryClient = createTestQueryClient()
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
    const { user } = renderWithProviders(<HookProbe />, { queryClient })

    await user.click(screen.getByRole('button', { name: 'notes' }))
    await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.customers.all }))
    expect(invalidate).not.toHaveBeenCalledWith({ queryKey: queryKeys.today.all })

    await user.click(screen.getByRole('button', { name: 'resume property' }))
    await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.today.all }))
    invalidate.mockClear()
    await user.click(screen.getByRole('button', { name: 'resume plan' }))
    await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.rounds.all }))
  })
})
