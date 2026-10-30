import { describe, expect, it, vi } from 'vitest'
import { act, screen, waitFor } from '@testing-library/react'
import { HttpResponse } from 'msw'
import { roundsApi } from '@/api/rounds.api'
import { OnHoldChip } from '@/components/round-planner/OnHoldChip'
import { ReassignTechnicianModal } from '@/components/todays-work/ReassignTechnicianModal'
import { useSetRoundTechnicians } from '@/features/rounds/hooks/useRounds'
import {
  allocationName,
  buildSplitInput,
  defaultSplit,
  formatSplitValue,
  manualBalance,
  splitFromAllocation,
  unassignedProperties,
} from '@/features/rounds/lib/split'
import { queryKeys } from '@/lib/query-keys'
import { todayIso } from '@/lib/round-dates'
import { server } from '@/test/msw/server'
import { apiError, on, specJson } from '@/test/msw/typed'
import { renderWithProviders } from '@/test/render'

const properties = [
  { propertyId: 'p1', addressLine: '1 A St', customerName: 'Jo', price: 20 },
  { propertyId: 'p2', addressLine: '2 B St', customerName: 'Al', price: 17 },
  { propertyId: 'p3', addressLine: '3 C St', customerName: 'Mo', price: 10 },
]

describe('split lib (GAP-012)', () => {
  it('defaults: one technician is SINGLE, two or more AUTO', () => {
    expect(defaultSplit([])).toEqual({ mode: 'SINGLE', singleId: null, manual: {} })
    expect(defaultSplit(['t1'])).toEqual({ mode: 'SINGLE', singleId: 't1', manual: {} })
    expect(defaultSplit(['t1', 't2']).mode).toBe('AUTO')
  })

  it('prefills from the saved allocation', () => {
    const saved = {
      mode: 'MANUAL' as const,
      allocation: [
        { technicianId: 't1', name: 'Sam', propertyIds: ['p1', 'p2'], stops: 2, value: '37.00' },
        { technicianId: 'gone', name: null, propertyIds: ['p3'], stops: 1, value: '10.00' },
      ],
    }
    expect(splitFromAllocation(undefined, ['t1', 't2']).mode).toBe('AUTO')
    expect(splitFromAllocation(saved, ['t1', 't2'])).toEqual({ mode: 'MANUAL', singleId: 't1', manual: { p1: 't1', p2: 't1' } })
    expect(splitFromAllocation({ ...saved, mode: 'SINGLE' }, ['t1', 't2']).mode).toBe('AUTO')
    expect(splitFromAllocation({ ...saved, mode: 'AUTO' }, ['t1', 't2']).mode).toBe('AUTO')
    expect(splitFromAllocation(saved, ['t1']).mode).toBe('SINGLE')
  })

  it('builds the PUT body for every mode', () => {
    expect(buildSplitInput([], undefined)).toEqual({ technicianIds: [] })
    expect(buildSplitInput(['t1'], undefined)).toEqual({ technicianIds: ['t1'], split: { mode: 'SINGLE' } })
    expect(buildSplitInput(['t1', 't2'], undefined)).toEqual({ technicianIds: ['t1', 't2'], split: { mode: 'AUTO' } })
    expect(buildSplitInput(['t1', 't2'], { mode: 'SINGLE', singleId: 't2', manual: {} })).toEqual({
      technicianIds: ['t2'],
      split: { mode: 'SINGLE' },
    })
    // A stale pick falls back to the first technician.
    expect(buildSplitInput(['t1', 't2'], { mode: 'SINGLE', singleId: 'gone', manual: {} }).technicianIds).toEqual(['t1'])
    expect(buildSplitInput(['t1', 't2'], { mode: 'SINGLE', singleId: null, manual: {} }).technicianIds).toEqual(['t1'])
    expect(buildSplitInput(['t1', 't2'], { mode: 'MANUAL', singleId: 't1', manual: { p1: 't1', p2: 't2', p3: 'gone' } })).toEqual({
      technicianIds: ['t1', 't2'],
      split: { mode: 'MANUAL', allocations: [{ propertyId: 'p1', technicianId: 't1' }, { propertyId: 'p2', technicianId: 't2' }] },
    })
  })

  it('balances a MANUAL split and lists what is unassigned', () => {
    const split = { mode: 'MANUAL' as const, singleId: 't1', manual: { p1: 't1', p2: 't2', p3: 'gone' } }
    expect(manualBalance(properties, split, ['t1', 't2'])).toEqual([
      { technicianId: 't1', stops: 1, value: 20 },
      { technicianId: 't2', stops: 1, value: 17 },
    ])
    expect(unassignedProperties(properties, split, ['t1', 't2']).map((row) => row.propertyId)).toEqual(['p3'])
  })

  it('formats values and names', () => {
    expect(formatSplitValue('37')).toBe('£37.00')
    expect(formatSplitValue(12.5)).toBe('£12.50')
    expect(formatSplitValue('oops')).toBe('£0.00')
    const entry = { technicianId: 't1', name: null, propertyIds: [], stops: 0, value: '0.00' }
    expect(allocationName(entry, () => 'From list')).toBe('From list')
    expect(allocationName({ ...entry, name: 'Sam' }, () => 'From list')).toBe('Sam')
  })
})

describe('rounds API (A1)', () => {
  it('PUT technicians (saved and dry run), GET allocation, round properties', async () => {
    const urls: string[] = []
    server.use(
      on('put', '/rounds/{id}/technicians', async ({ request }) => {
        urls.push(new URL(request.url).search)
        return specJson('/rounds/{id}/technicians', 'put', 200, { roundId: 'r1', allocation: [], visitsUpdated: 3 })
      }),
      on('get', '/rounds/{id}/allocation', () => specJson('/rounds/{id}/allocation', 'get', 200, { mode: 'AUTO', allocation: [] })),
      on('get', '/customers', () => HttpResponse.json({})),
    )
    expect((await roundsApi.setTechnicians('r1', { technicianIds: ['t1'] })).visitsUpdated).toBe(3)
    await roundsApi.setTechnicians('r1', { technicianIds: ['t1'] }, { dryRun: true })
    expect(urls).toEqual(['', '?dryRun=true'])
    expect((await roundsApi.getAllocation('r1')).mode).toBe('AUTO')
    expect(await roundsApi.listProperties('r1')).toEqual([])
  })

  it('useSetRoundTechnicians refreshes rounds, today and customers', async () => {
    let save: ReturnType<typeof useSetRoundTechnicians> | undefined
    function Harness() {
      save = useSetRoundTechnicians()
      return null
    }
    const { queryClient } = renderWithProviders(<Harness />)
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
    await act(() => save!.mutateAsync({ id: 'r1', input: { technicianIds: ['t1'] } }))
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.rounds.all })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.today.all })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.customers.all })
  })
})

describe('OnHoldChip (GAP-026)', () => {
  it('shows only for a held stop', () => {
    const { rerender } = renderWithProviders(<OnHoldChip paymentHold={false} />)
    expect(screen.queryByText('On hold')).not.toBeInTheDocument()
    rerender(<OnHoldChip paymentHold />)
    expect(screen.getByText('On hold')).toBeInTheDocument()
  })
})

describe('Reassign technician (GAP-013)', () => {
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

  function handlers(result: () => Response) {
    let body: unknown
    server.use(
      on('get', '/settings/technicians', () =>
        HttpResponse.json([
          { id: 't1', name: 'Sam', displayName: 'Sam', appStatus: 'ACTIVE', active: true },
          { id: 't2', name: 'Alex', displayName: 'Alex', appStatus: 'ACTIVE', active: true },
        ]),
      ),
      on('get', '/rounds/{id}/today', () => HttpResponse.json({}, { status: 404 })),
      on('post', '/rounds/{id}/reassign', async ({ request }) => {
        body = await request.json()
        return result()
      }),
    )
    return () => body
  }

  it('moves the day’s unassigned visits (fromTechnicianId null), permanent + ALL', async () => {
    const sent = handlers(() => specJson('/rounds/{id}/reassign', 'post', 200, { updated: 4 }))
    const onClose = vi.fn()
    const { user } = renderWithProviders(<ReassignTechnicianModal open round={round} onClose={onClose} />)
    expect(screen.getByText(/No technician is on these visits yet/)).toBeInTheDocument()
    expect(screen.getByDisplayValue('Unassigned visits')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reassign Jobs' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Select Technician' }))
    await user.click(await screen.findByRole('option', { name: 'Alex' }))
    await user.click(screen.getByRole('button', { name: /All jobs/ }))
    await user.click(screen.getByRole('switch', { name: 'Make permanent' }))
    await user.click(screen.getByRole('button', { name: 'Reassign Jobs' }))
    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(sent()).toEqual({
      date: todayIso(),
      fromTechnicianId: null,
      toTechnicianId: 't2',
      scope: 'ALL',
      permanent: true,
      note: null,
      notify: false,
    })
    expect(screen.getByText('4 jobs updated.')).toBeInTheDocument()
  })

  it('reassigns from the current technician (REMAINING) and says "1 job"', async () => {
    const sent = handlers(() => specJson('/rounds/{id}/reassign', 'post', 200, { updated: 1 }))
    const onClose = vi.fn()
    const { user } = renderWithProviders(
      <ReassignTechnicianModal open round={{ ...round, technician: 'Sam', technicianId: 't1' }} onClose={onClose} />,
    )
    expect(screen.queryByText(/No technician is on these visits yet/)).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Select Technician' }))
    await user.click(await screen.findByRole('option', { name: 'Alex' }))
    await user.click(screen.getByRole('button', { name: 'Reassign Jobs' }))
    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(sent()).toMatchObject({ fromTechnicianId: 't1', scope: 'REMAINING', permanent: false })
    expect(screen.getByText('1 job updated.')).toBeInTheDocument()
  })

  it('shows the server’s error (e.g. day already closed)', async () => {
    handlers(() => apiError(409, 'The operational day has already been closed'))
    const onClose = vi.fn()
    const { user } = renderWithProviders(<ReassignTechnicianModal open round={round} onClose={onClose} />)
    await user.click(screen.getByRole('button', { name: 'Select Technician' }))
    await user.click(await screen.findByRole('option', { name: 'Alex' }))
    await user.click(screen.getByRole('button', { name: 'Reassign Jobs' }))
    expect(await screen.findByText('The operational day has already been closed')).toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()
  })
})
