import { describe, expect, it } from 'vitest'
import { HttpResponse, http } from 'msw'
import { screen, waitFor, within } from '@testing-library/react'
import type { CarryoverOption, CarryoverResult } from '@/api/carryover.api'
import { CloseOperationalDayModal } from '@/components/todays-work/CloseOperationalDayModal'
import { conflictLines, conflictReason, defaultOption, movedText, carriedOverBadge } from '@/features/today/lib/carryover'
import { technicianFixture } from '@/test/msw/handlers/technicians'
import { server } from '@/test/msw/server'
import { API, apiError, gate, on, specJson } from '@/test/msw/typed'
import { renderWithProviders } from '@/test/render'

const kpi = { totalStops: 10, completed: 4, skipped: 1, issues: 0, paymentHolds: 0, valueCompleted: 100 } as never

const friday: CarryoverOption[] = [
  { key: 'SATURDAY', date: '2026-11-07', label: 'Saturday', default: false },
  { key: 'MONDAY', date: '2026-11-09', label: 'Monday', default: true },
]
const thursday: CarryoverOption[] = [{ key: 'NEXT_WORKING_DAY', date: '2026-11-06', label: 'Friday', default: true }]

function result(overrides: Partial<CarryoverResult> = {}): CarryoverResult {
  return {
    moved: 5,
    targetDate: '2026-11-09',
    conflicts: [],
    notifiedTechnicians: 2,
    notifiedCustomers: 0,
    skipped: [],
    dryRun: false,
    ...overrides,
  }
}

type Calls = { carryover: Record<string, unknown>[]; close: Record<string, unknown>[] }

function handlers(options: CarryoverOption[], calls: Calls, overrides: { dry?: CarryoverResult; real?: CarryoverResult; closeExtra?: Record<string, unknown> } = {}) {
  return [
    http.get(`${API}/visits/carryover/options`, () => HttpResponse.json({ date: '2026-11-05', options })),
    http.post(`${API}/visits/carryover`, async ({ request }) => {
      const body = (await request.json()) as Record<string, unknown>
      calls.carryover.push(body)
      return HttpResponse.json(body.dryRun ? (overrides.dry ?? result()) : (overrides.real ?? result({ notifiedCustomers: 3 })))
    }),
    http.post(`${API}/today/close`, async ({ request }) => {
      calls.close.push((await request.json()) as Record<string, unknown>)
      return HttpResponse.json({
        completedJobs: 4, skippedJobs: 1, outstanding: 5, issues: 0, paymentHolds: 0, revenue: 100, carriedToDate: '2026-11-09',
        ...(overrides.closeExtra ?? {}),
      })
    }),
    on('get', '/technicians', () =>
      specJson('/technicians', 'get', 200, [technicianFixture({ id: 't1', name: 'Sam' }), technicianFixture({ id: 't3', name: null as never })]),
    ),
  ]
}

function open(onClose = () => undefined) {
  return renderWithProviders(<CloseOperationalDayModal open date="2026-11-05" dateLabel="Thu 5 Nov" kpi={kpi} onClose={onClose} />)
}

async function pushToTomorrow(user: ReturnType<typeof open>['user']) {
  await user.click(screen.getByRole('button', { name: /Push to tomorrow/ }))
}

describe('carryover helpers (ACT-02..04)', () => {
  it('picks the default option, or the first, or nothing', () => {
    expect(defaultOption(friday)?.key).toBe('MONDAY')
    expect(defaultOption([{ ...friday[0] }])?.key).toBe('SATURDAY')
    expect(defaultOption(undefined)).toBeUndefined()
  })

  it('words conflicts, counts and the badge', () => {
    const names = new Map([['t1', 'Sam']])
    expect(conflictReason('TECHNICIAN_INACTIVE')).toBe('has been deactivated')
    expect(conflictReason('NEW')).toBe('cannot work (NEW)')
    expect(
      conflictLines(
        [
          { visitId: 'a', technicianId: 't1', reason: 'TECHNICIAN_UNAVAILABLE' },
          { visitId: 'b', technicianId: 't1', reason: 'TECHNICIAN_UNAVAILABLE' },
          { visitId: 'c', technicianId: 'zz', reason: 'TECHNICIAN_INACTIVE' },
        ],
        names,
      ),
    ).toEqual(['Sam is not available', 'A technician has been deactivated'])
    expect(movedText(0, '2026-11-09', 'preview')).toBe('No jobs need to move.')
    expect(movedText(0, '2026-11-09', 'result')).toBe('No jobs needed to move.')
    expect(movedText(1, '2026-11-09', 'preview')).toBe('1 job will move to Mon 9 Nov.')
    expect(movedText(3, '2026-11-09', 'result')).toBe('3 jobs carried over to Mon 9 Nov.')
    expect(carriedOverBadge('2026-11-05')).toBe('Carried over from Thu 5 Nov')
    expect(carriedOverBadge(null)).toBe('Carried over')
  })
})

describe('Close day carryover (ACT-02..04)', () => {
  it('always offers Saturday or Monday on a Friday, previews with a dry run, then closes with the chosen target', async () => {
    const calls: Calls = { carryover: [], close: [] }
    server.use(
      ...handlers(friday, calls, {
        dry: result({
          conflicts: [
            { visitId: 'v1', technicianId: 't1', reason: 'TECHNICIAN_UNAVAILABLE' },
            { visitId: 'v2', technicianId: 't1', reason: 'TECHNICIAN_UNAVAILABLE' },
            { visitId: 'v3', technicianId: 't3', reason: 'TECHNICIAN_INACTIVE' },
          ],
          skipped: [{ visitId: 'v9', reason: 'NOT_UNFINISHED' }],
        }),
      }),
    )
    const { user } = open()
    await pushToTomorrow(user)

    const group = await screen.findByRole('group', { name: 'Move unfinished jobs to' })
    const monday = within(group).getByRole('radio', { name: 'Monday (Mon 9 Nov)' })
    expect(monday).toBeChecked()
    expect(within(group).getByRole('radio', { name: 'Saturday (Sat 7 Nov)' })).not.toBeChecked()
    await user.click(within(group).getByRole('radio', { name: 'Saturday (Sat 7 Nov)' }))
    expect(screen.getByRole('checkbox', { name: 'Also tell affected customers' })).not.toBeChecked()

    await user.click(screen.getByRole('button', { name: 'Push to tomorrow' }))
    expect(await screen.findByText('5 jobs will move to Mon 9 Nov.')).toBeInTheDocument()
    expect(screen.getByText('Sam is not available')).toBeInTheDocument()
    expect(screen.getByText('A technician has been deactivated')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Reassign these jobs in the Round Planner' })).toHaveAttribute('href', '/round-planner')
    expect(screen.getByText('1 jobs will stay where they are.')).toBeInTheDocument()
    expect(calls.carryover[0]).toMatchObject({ date: '2026-11-05', target: 'SATURDAY', dryRun: true })

    await user.click(screen.getByRole('button', { name: 'Close Operational Day' }))
    const status = await screen.findByRole('status')
    expect(status).toHaveTextContent('5 jobs carried over to Mon 9 Nov.')
    expect(calls.close).toEqual([{ unfinishedAction: 'push_to_tomorrow', target: 'SATURDAY' }])
    expect(calls.carryover).toHaveLength(1)
  })

  it('shows plain text from Monday to Thursday and sends the next working day', async () => {
    const calls: Calls = { carryover: [], close: [] }
    server.use(...handlers(thursday, calls, { dry: result({ moved: 1, targetDate: '2026-11-06' }), closeExtra: { outstanding: 1 } }))
    const { user } = open()
    await pushToTomorrow(user)
    expect(await screen.findByText('Unfinished jobs move to Friday (Fri 6 Nov).')).toBeInTheDocument()
    expect(screen.queryByRole('radio')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Push to tomorrow' }))
    expect(await screen.findByText('1 job will move to Fri 6 Nov.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Close Operational Day' }))
    expect(await screen.findByRole('status')).toHaveTextContent('1 job carried over')
    expect(calls.close).toEqual([{ unfinishedAction: 'push_to_tomorrow', target: 'NEXT_WORKING_DAY' }])
  })

  it('tells customers only when the box is ticked: ONE close call carries the flag, and reports its counts', async () => {
    const calls: Calls = { carryover: [], close: [] }
    server.use(...handlers(friday, calls, { closeExtra: { outstanding: 4, notifiedCustomers: 3, customerNotificationError: 'GHL timeout' } }))
    const { user } = open()
    await pushToTomorrow(user)
    await user.click(await screen.findByRole('checkbox', { name: 'Also tell affected customers' }))
    await user.click(screen.getByRole('button', { name: 'Push to tomorrow' }))
    await screen.findByText('5 jobs will move to Mon 9 Nov.')
    await user.click(screen.getByRole('button', { name: 'Close Operational Day' }))
    const status = await screen.findByRole('status')
    expect(status).toHaveTextContent('4 jobs carried over to Mon 9 Nov.')
    expect(status).toHaveTextContent('3 customers told.')
    expect(status).toHaveTextContent('Customers could not be told: GHL timeout')
    // Only the dry-run preview hits /visits/carryover; the real work is the single close call.
    expect(calls.carryover.every((call) => call.dryRun === true)).toBe(true)
    expect(calls.close).toEqual([{ unfinishedAction: 'push_to_tomorrow', target: 'MONDAY', notifyCustomers: true }])
  })

  it('handles option and preview failures, and keeps the day closable', async () => {
    const calls: Calls = { carryover: [], close: [] }
    let failOptions = true
    server.use(
      http.get(`${API}/visits/carryover/options`, () =>
        failOptions ? apiError(500, 'options down') : HttpResponse.json({ date: '2026-11-05', options: thursday }),
      ),
      ...handlers(thursday, calls),
    )
    const { user } = open()
    await pushToTomorrow(user)
    expect(await screen.findByText('The available days could not be loaded.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Push to tomorrow' })).toBeDisabled()
    failOptions = false
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    await screen.findByText(/Unfinished jobs move to Friday/)

    server.use(http.post(`${API}/visits/carryover`, () => apiError(500, 'preview down')))
    await user.click(screen.getByRole('button', { name: 'Push to tomorrow' }))
    expect(await screen.findByText('The move could not be checked. You can still close the day.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Close Operational Day' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Day closed')
  })

  it('shows the server reason when the target is rejected, and the loading states', async () => {
    const calls: Calls = { carryover: [], close: [] }
    const optionsGate = gate()
    const previewGate = gate()
    server.use(
      http.post(`${API}/today/close`, () => apiError(400, 'bad', 'INVALID_CARRYOVER_TARGET')),
      http.get(`${API}/visits/carryover/options`, async () => {
        await optionsGate.wait()
        return HttpResponse.json({ date: '2026-11-05', options: friday })
      }),
      http.post(`${API}/visits/carryover`, async () => {
        await previewGate.wait()
        return HttpResponse.json(result())
      }),
      ...handlers(friday, calls),
    )
    const { user } = open()
    await pushToTomorrow(user)
    expect(screen.getByText('Finding the next working day…')).toBeInTheDocument()
    optionsGate.release()
    await screen.findByRole('group', { name: 'Move unfinished jobs to' })
    await user.click(screen.getByRole('button', { name: 'Push to tomorrow' }))
    expect(screen.getByText('Checking the move…')).toBeInTheDocument()
    previewGate.release()
    await screen.findByText('5 jobs will move to Mon 9 Nov.')
    await user.click(screen.getByRole('button', { name: 'Close Operational Day' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('That day is not available. Pick one of the offered days.')
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('closes without carryover when skipping, and falls back to the server message or a generic one', async () => {
    const calls: Calls = { carryover: [], close: [] }
    let status = 400
    let optionRequests = 0
    server.use(
      http.get(`${API}/visits/carryover/options`, () => {
        optionRequests += 1
        return HttpResponse.json({ date: '2026-11-05', options: friday })
      }),
      http.post(`${API}/today/close`, async ({ request }) => {
        calls.close.push((await request.json()) as Record<string, unknown>)
        return status === 200
          ? HttpResponse.json({ completedJobs: 0, skippedJobs: 0, outstanding: 0, issues: 0, paymentHolds: 0, revenue: 0 })
          : apiError(status, 'Server said no')
      }),
      ...handlers(friday, calls),
    )
    let closed = false
    const { user } = open(() => {
      closed = true
    })
    await user.click(screen.getByRole('button', { name: /Mark as skipped/ }))
    await user.click(screen.getByRole('button', { name: 'Mark as skipped' }))
    await user.click(screen.getByRole('button', { name: 'Close Operational Day' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Server said no')
    status = 200
    await user.click(screen.getByRole('button', { name: 'Close Operational Day' }))
    await waitFor(() => expect(closed).toBe(true))
    expect(calls.close.at(-1)).toEqual({ unfinishedAction: 'mark_as_skipped' })
    expect(optionRequests).toBe(0)
  })
})
