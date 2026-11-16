import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import type { Closure, ClosureApplyPreview, ClosureApplyResult } from '@/features/closures/types'
import { ApiError } from '@/lib/errors'
import { technicianFixture } from '@/test/msw/handlers/technicians'
import { server } from '@/test/msw/server'
import { on, specJson } from '@/test/msw/typed'
import { renderWithProviders } from '@/test/render'

const mocks = vi.hoisted(() => ({
  loadPreview: vi.fn(),
  apply: vi.fn(),
  preview: {} as Record<string, unknown>,
  applying: false,
}))
vi.mock('@/features/closures/hooks/useClosures', () => ({
  useClosureApplyPreview: () => ({ mutate: mocks.loadPreview, ...mocks.preview }),
  useApplyClosure: () => ({ mutateAsync: mocks.apply, isPending: mocks.applying }),
}))

const { ApplyPreviewDialog } = await import('@/features/closures/components/ApplyPreviewDialog')

const closure: Closure = {
  id: 'c1',
  label: 'Christmas',
  startDate: '2026-12-28',
  endDate: '2027-01-01',
  mode: 'MOVE',
  notifyCustomers: false,
  roundIds: [],
  appliedAt: null,
  createdAt: '2026-11-01T00:00:00Z',
  updatedAt: '2026-11-01T00:00:00Z',
}

function movePreview(overrides: Partial<ClosureApplyPreview> = {}): ClosureApplyPreview {
  return {
    closureId: 'c1',
    mode: 'MOVE',
    totals: { visits: 21, rounds: 2, customers: 18, technicianConflicts: 0 },
    rounds: [
      { roundId: 'r1', roundName: 'Alnwick Mon', visitCount: 20, groups: [{ from: '2026-12-28', to: '2027-01-04', count: 20 }] },
      { roundId: 'r2', roundName: 'Berwick Thu', visitCount: 1, groups: [{ from: '2026-12-31', to: '2027-01-07', count: 1 }] },
    ],
    conflicts: [],
    customerMessage: 'We are closed over Christmas.',
    ...overrides,
  }
}

function result(overrides: Partial<ClosureApplyResult> = {}): ClosureApplyResult {
  return {
    closureId: 'c1',
    mode: 'MOVE',
    moved: 21,
    skipped: 0,
    conflicts: [],
    notifiedTechnicians: 2,
    notifiedCustomers: 0,
    appliedAt: '2026-11-16T10:00:00Z',
    ...overrides,
  }
}

function setup(options: { closure?: Closure; preview?: Record<string, unknown>; open?: boolean } = {}) {
  mocks.preview = options.preview ?? { isIdle: false, isPending: false, isError: false, isSuccess: true, data: movePreview() }
  const onClose = vi.fn()
  const view = renderWithProviders(<ApplyPreviewDialog closure={options.closure ?? closure} open={options.open ?? true} onClose={onClose} />)
  return { ...view, onClose }
}

const confirmButton = () => screen.getByRole('button', { name: 'Apply to existing visits' })

beforeEach(() => {
  mocks.loadPreview.mockReset()
  mocks.apply.mockReset()
  mocks.preview = {}
  mocks.applying = false
})

describe('ApplyPreviewDialog preview', () => {
  it('asks for the preview when it opens and shows a status while waiting', () => {
    setup({ preview: { isIdle: true, isPending: false, isError: false, isSuccess: false } })
    expect(mocks.loadPreview).toHaveBeenCalledWith('c1')
    expect(screen.getByRole('dialog', { name: 'Apply "Christmas" to existing visits' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Checking which visits are affected')
    expect(screen.queryByRole('button', { name: 'Apply to existing visits' })).not.toBeInTheDocument()
  })

  it('does nothing while closed', () => {
    setup({ open: false })
    expect(mocks.loadPreview).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('renders MOVE totals and a group per round, with singular and plural wording', () => {
    setup()
    expect(screen.getByText('21 visits across 2 rounds will be moved. 18 customers are affected.')).toBeInTheDocument()
    expect(screen.getByText('Alnwick Mon: 20 visits')).toBeInTheDocument()
    expect(screen.getByText('20 visits: Mon 28 Dec -> Mon 4 Jan')).toBeInTheDocument()
    expect(screen.getByText('Berwick Thu: 1 visit')).toBeInTheDocument()
    expect(screen.getByText('1 visit: Thu 31 Dec -> Thu 7 Jan')).toBeInTheDocument()
    expect(screen.queryByText(/technician conflict/)).not.toBeInTheDocument()
  })

  it('renders SKIP groups that have no destination', () => {
    setup({
      closure: { ...closure, mode: 'SKIP' },
      preview: {
        isIdle: false, isPending: false, isError: false, isSuccess: true,
        data: movePreview({
          mode: 'SKIP',
          totals: { visits: 501, rounds: 1, customers: 500, technicianConflicts: 0 },
          rounds: [
            {
              roundId: 'r1',
              roundName: 'Big round',
              visitCount: 500,
              groups: [
                { from: '2026-12-28', to: null, count: 499 },
                { from: '2026-12-29', to: null, count: 1 },
              ],
            },
          ],
        }),
      },
    })
    expect(screen.getByText('501 visits across 1 rounds will be skipped. 500 customers are affected.')).toBeInTheDocument()
    expect(screen.getByText('499 visits on Mon 28 Dec will be skipped')).toBeInTheDocument()
    expect(screen.getByText('1 visit on Tue 29 Dec will be skipped')).toBeInTheDocument()
    expect(screen.queryByText(/->/)).not.toBeInTheDocument()
  })

  it('says nothing will change and offers no confirm when no visits are affected', () => {
    setup({
      preview: {
        isIdle: false, isPending: false, isError: false, isSuccess: true,
        data: movePreview({ totals: { visits: 0, rounds: 0, customers: 0, technicianConflicts: 0 }, rounds: [] }),
      },
    })
    expect(screen.getByText('No existing visits fall inside this closure. Nothing will change.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Apply to existing visits' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
  })

  it('lists technician conflicts with names and a pointer to the planner', async () => {
    server.use(
      on('get', '/technicians', () => specJson('/technicians', 'get', 200, [technicianFixture({ id: 't1', name: 'Sam' }), technicianFixture({ id: 't2', name: null as never })])),
    )
    setup({
      preview: {
        isIdle: false, isPending: false, isError: false, isSuccess: true,
        data: movePreview({
          totals: { visits: 21, rounds: 2, customers: 18, technicianConflicts: 2 },
          conflicts: [
            { visitId: 'v1', technicianId: 't1', reason: 'TECHNICIAN_UNAVAILABLE' },
            { visitId: 'v2', technicianId: 't1', reason: 'TECHNICIAN_UNAVAILABLE' },
          ],
        }),
      },
    })
    expect(screen.getByText('2 technician conflicts')).toBeInTheDocument()
    expect(await screen.findByText('Sam is not available')).toBeInTheDocument()
    expect(screen.getAllByText('Sam is not available')).toHaveLength(1)
    expect(screen.getByText('Reassign these visits in the Round Planner.')).toBeInTheDocument()
  })

  it('uses the singular for one conflict and a generic name when the technician is not known', () => {
    setup({
      preview: {
        isIdle: false, isPending: false, isError: false, isSuccess: true,
        data: movePreview({
          totals: { visits: 21, rounds: 2, customers: 18, technicianConflicts: 1 },
          conflicts: [{ visitId: 'v1', technicianId: 'tX', reason: 'TECHNICIAN_INACTIVE' }],
        }),
      },
    })
    expect(screen.getByText('1 technician conflict')).toBeInTheDocument()
    expect(screen.getByText('A technician has been deactivated')).toBeInTheDocument()
  })

  it('shows the customer message only when the notify box is ticked', async () => {
    const { user } = setup()
    expect(screen.getByRole('checkbox', { name: 'Tell customers' })).not.toBeChecked()
    expect(screen.queryByText('We are closed over Christmas.')).not.toBeInTheDocument()
    expect(screen.getByText(/Customers will not be told/)).toBeInTheDocument()
    await user.click(screen.getByRole('checkbox', { name: 'Tell customers' }))
    expect(screen.getByText('We are closed over Christmas.')).toBeInTheDocument()
    expect(screen.getByText('Message customers will receive')).toBeInTheDocument()
    expect(screen.queryByText(/Customers will not be told/)).not.toBeInTheDocument()
  })

  it('starts ticked when the closure itself tells customers', () => {
    setup({ closure: { ...closure, notifyCustomers: true } })
    expect(screen.getByRole('checkbox', { name: 'Tell customers' })).toBeChecked()
    expect(screen.getByText('We are closed over Christmas.')).toBeInTheDocument()
  })

  it('shows a retry when the preview fails', async () => {
    const { user } = setup({ preview: { isIdle: false, isPending: false, isError: true, isSuccess: false } })
    expect(screen.getByRole('alert')).toHaveTextContent('The visits could not be checked. Try again.')
    expect(mocks.loadPreview).toHaveBeenCalledTimes(1)
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    expect(mocks.loadPreview).toHaveBeenCalledTimes(2)
    expect(mocks.apply).not.toHaveBeenCalled()
  })

  it('cancels without applying', async () => {
    const { user, onClose } = setup()
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onClose).toHaveBeenCalled()
    expect(mocks.apply).not.toHaveBeenCalled()
  })

  it('is a labelled dialog that keeps focus inside and closes on Escape', async () => {
    const { user, onClose } = setup()
    const dialog = screen.getByRole('dialog', { name: 'Apply "Christmas" to existing visits' })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toContainElement(document.activeElement as HTMLElement)
    await user.tab()
    expect(dialog).toContainElement(document.activeElement as HTMLElement)
    // Every control meets the 24px target class used across the app.
    for (const box of within(dialog).getAllByRole('checkbox')) expect(box).toHaveClass('h-6', 'w-6')
    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalled()
  })
})

describe('ApplyPreviewDialog apply', () => {
  it('applies once with the notify choice, even if Confirm is pressed twice', async () => {
    let finish: (value: ClosureApplyResult) => void = () => undefined
    mocks.apply.mockReturnValue(new Promise<ClosureApplyResult>((resolve) => (finish = resolve)))
    const { user } = setup()
    await user.click(screen.getByRole('checkbox', { name: 'Tell customers' }))
    await user.click(confirmButton())
    await user.click(confirmButton())
    expect(mocks.apply).toHaveBeenCalledTimes(1)
    expect(mocks.apply).toHaveBeenCalledWith({ id: 'c1', input: { notifyCustomers: true } })
    finish(result({ notifiedCustomers: 18 }))
    expect(await screen.findByText('Closure applied')).toBeInTheDocument()
  })

  it('reports what was done and closes with Done', async () => {
    mocks.apply.mockResolvedValue(result({ moved: 1, skipped: 1, notifiedTechnicians: 1, notifiedCustomers: 1, conflicts: [{ visitId: 'v', technicianId: 't', reason: 'TECHNICIAN_INACTIVE' }] }))
    const { user, onClose } = setup()
    await user.click(confirmButton())
    expect(await screen.findByText('Closure applied')).toBeInTheDocument()
    expect(screen.getByText('1 visit moved.')).toBeInTheDocument()
    expect(screen.getByText('1 visit skipped.')).toBeInTheDocument()
    expect(screen.getByText('1 technician told.')).toBeInTheDocument()
    expect(screen.getByText('1 customer told.')).toBeInTheDocument()
    expect(screen.getByText('1 technician conflict to sort out in the Round Planner.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Apply to existing visits' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Done' }))
    expect(onClose).toHaveBeenCalled()
  })

  it('uses plural wording for larger numbers', async () => {
    mocks.apply.mockResolvedValue(
      result({ moved: 5, skipped: 3, notifiedTechnicians: 2, notifiedCustomers: 4, conflicts: [1, 2].map((n) => ({ visitId: `v${n}`, technicianId: 't', reason: 'TECHNICIAN_UNAVAILABLE' as const })) }),
    )
    const { user } = setup()
    await user.click(confirmButton())
    expect(await screen.findByText('5 visits moved.')).toBeInTheDocument()
    expect(screen.getByText('3 visits skipped.')).toBeInTheDocument()
    expect(screen.getByText('2 technicians told.')).toBeInTheDocument()
    expect(screen.getByText('4 customers told.')).toBeInTheDocument()
    expect(screen.getByText('2 technician conflicts to sort out in the Round Planner.')).toBeInTheDocument()
  })

  it('says so when nothing needed to change', async () => {
    mocks.apply.mockResolvedValue(result({ moved: 0, skipped: 0, notifiedTechnicians: 0 }))
    const { user } = setup()
    await user.click(confirmButton())
    expect(await screen.findByText('No visits needed to change.')).toBeInTheDocument()
    expect(screen.queryByText(/told\./)).not.toBeInTheDocument()
  })

  it('shows a failed customer message as a warning and still reports success', async () => {
    mocks.apply.mockResolvedValue(result({ customerNotificationError: 'SMS provider down' }))
    const { user } = setup()
    await user.click(confirmButton())
    expect(await screen.findByText('Closure applied')).toBeInTheDocument()
    expect(screen.getByText('21 visits moved.')).toBeInTheDocument()
    const warning = screen.getByText('The visits were changed, but customers could not be told: SMS provider down')
    expect(warning).toHaveAttribute('role', 'status')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('shows CLOSURE_ENDED and offers no retry', async () => {
    mocks.apply.mockRejectedValue(new ApiError(409, 'ended', 'CLOSURE_ENDED'))
    const { user } = setup()
    await user.click(confirmButton())
    expect(await screen.findByRole('alert')).toHaveTextContent('This closure has already ended')
    expect(screen.queryByRole('button', { name: 'Apply to existing visits' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument()
  })

  it('offers a retry after a network failure and a failure with an unknown code', async () => {
    mocks.apply.mockRejectedValueOnce(new TypeError('network')).mockRejectedValueOnce(new ApiError(500, 'x', 'WHATEVER')).mockResolvedValueOnce(result())
    const { user } = setup()
    await user.click(confirmButton())
    expect(await screen.findByRole('alert')).toHaveTextContent('The closure could not be applied. Nothing is applied twice if you try again.')
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    await waitFor(() => expect(mocks.apply).toHaveBeenCalledTimes(2))
    expect(await screen.findByRole('alert')).toHaveTextContent('The closure could not be applied.')
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByText('Closure applied')).toBeInTheDocument()
    expect(mocks.apply.mock.calls.map((call) => call[0])).toEqual([
      { id: 'c1', input: { notifyCustomers: false } },
      { id: 'c1', input: { notifyCustomers: false } },
      { id: 'c1', input: { notifyCustomers: false } },
    ])
  })

  it('shows Applying and locks the button while the request is in flight', () => {
    mocks.applying = true
    setup()
    expect(screen.getByRole('button', { name: 'Applying…' })).toBeDisabled()
  })
})
