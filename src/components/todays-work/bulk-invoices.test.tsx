import { describe, expect, it, vi } from 'vitest'
import { delay } from 'msw'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import type { InvoiceBulkPreview } from '@/api/invoices.api'
import type { TodayAggregate } from '@/api/today.api'
import { BulkInvoicesModal } from '@/components/todays-work/BulkInvoicesModal'
import { TodaysWorkScreen } from '@/components/todays-work/TodaysWorkScreen'
import { TodaysWorkRoundsTable } from '@/components/todays-work/TodaysWorkRoundsTable'
import { todaysWorkContent } from '@/content/todays-work'
import {
  formatPounds,
  selectedTotals,
  skipReasonLabel,
  summarizeBulkResult,
} from '@/features/today/lib/bulk-invoices'
import { todayRoundToUi, todayTechniciansToWorkload } from '@/features/today/lib/mappers'
import { formatUpdatedLabel, todayUpdatedAt } from '@/features/today/lib/updated-at'
import { useTodaysWorkInteractions } from '@/hooks/use-todays-work-interactions'
import { queryKeys } from '@/lib/query-keys'
import { todayIso } from '@/lib/round-dates'
import { setBootstrap } from '@/test/bootstrap'
import { server } from '@/test/msw/server'
import { apiError, gate, on, specJson } from '@/test/msw/typed'
import { renderWithProviders } from '@/test/render'

const preview: InvoiceBulkPreview = {
  items: [
    { visitId: 'v1', customerName: 'Jo Coates', address: '4 Hotspur St', amount: 20, vat: 0, total: 20, paymentMethod: 'BACS' },
    { visitId: 'v2', customerName: 'Ann Bell', amount: 15.5 },
    {},
  ],
  skipped: [
    { visitId: 'v3', customerName: 'Tom Hall', reason: 'ON_HOLD' },
    { reason: 'ALREADY_INVOICED' },
  ],
  totals: { count: 3, amount: '35.50' },
}

const round = {
  roundId: 'r1',
  roundName: 'Alnwick Fri',
  technicianId: 't1',
  technicianName: 'Sam',
  status: 'in_progress' as const,
  total: 4,
  completed: 2,
  skipped: 0,
  issueCount: 0,
  paymentHolds: 1,
  scheduledValue: 80,
  completedValue: 40,
  value: 40,
  etaMinutes: null,
}

function aggregate(overrides: Partial<TodayAggregate> = {}): TodayAggregate {
  return {
    date: '2026-10-30',
    generatedAt: '2026-10-30T09:41:00',
    dayClosed: false,
    kpi: { totalStops: 4, inProgress: 1, completed: 2, skipped: 0, issues: 0, paymentHolds: 1, valueCompleted: 40 },
    rounds: [round],
    technicians: [{ technicianId: 't1', technicianName: null, completed: 2, remaining: 2, issueCount: 0, onTrack: true }],
    ...overrides,
  }
}

describe('bulk invoice helpers (GAP-014)', () => {
  it('formats amounts, reasons and live totals', () => {
    expect(formatPounds('246')).toBe('£246.00')
    expect(formatPounds(12.5)).toBe('£12.50')
    expect(formatPounds(undefined)).toBe('£0.00')
    expect(formatPounds('abc')).toBe('£0.00')
    expect(skipReasonLabel('ALREADY_INVOICED')).toBe('Already invoiced')
    expect(skipReasonLabel('ON_HOLD')).toBe('Customer on payment hold')
    expect(skipReasonLabel(undefined)).toBe('Not completed yet')
    expect(selectedTotals(preview.items, new Set())).toEqual({ count: 3, amount: 35.5 })
    expect(selectedTotals(preview.items, new Set(['v1']))).toEqual({ count: 2, amount: 15.5 })
  })

  it('summarises created and failed invoices, incl. created-but-not-sent', () => {
    const ok = summarizeBulkResult({ created: [{ visitId: 'v1', invoiceId: 'i1', invoiceNumber: 'INV-1', total: 20 }], failed: [], totals: { count: 1, amount: '20.00' } }, preview.items)
    expect(ok).toEqual({ headline: '1 invoices, £20.00', failures: [] })
    const mixed = summarizeBulkResult(
      {
        created: [{ visitId: 'v1', invoiceId: 'i1', invoiceNumber: 'INV-1', sent: false }],
        failed: [
          { visitId: 'v1', invoiceId: 'i1', error: 'No mobile on file' },
          { visitId: 'v2', error: 'Plan has no price' },
          { invoiceId: 'i9' },
          {},
        ],
        totals: {},
      },
      preview.items,
    )
    expect(mixed.headline).toBe('1 invoices, £0.00 · 4 failed')
    expect(mixed.failures).toEqual([
      { visitId: 'v1', customerName: 'Jo Coates', message: 'Invoice INV-1 created but not sent: No mobile on file' },
      { visitId: 'v2', customerName: 'Ann Bell', message: 'Plan has no price' },
      { visitId: '', customerName: 'Customer', message: 'Invoice i9 created but not sent' },
      { visitId: '', customerName: 'Customer', message: '' },
    ])
  })
})

describe('BulkInvoicesModal (GAP-014)', () => {
  it('previews, excludes an unticked visit, sends with a channel and shows the summary', async () => {
    let created: unknown
    const hold = gate()
    server.use(
      on('post', '/invoices/bulk/preview', () => specJson('/invoices/bulk/preview', 'post', 200, preview)),
      on('post', '/invoices/bulk', async ({ request }) => {
        created = await request.json()
        await hold.wait()
        return specJson('/invoices/bulk', 'post', 200, {
          created: [{ visitId: 'v2', invoiceId: 'i2', invoiceNumber: 'INV-2', total: 15.5, sent: false }],
          failed: [{ visitId: 'v2', invoiceId: 'i2', error: 'GHL rejected the message' }, {}],
          totals: { count: 1, amount: '15.50' },
        })
      }),
    )
    const onClose = vi.fn()
    const { user, queryClient } = renderWithProviders(<BulkInvoicesModal date="2026-10-30" onClose={onClose} />)
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
    expect(screen.getByText('Checking today’s visits…')).toBeInTheDocument()

    expect(await screen.findByText('Jo Coates')).toBeInTheDocument()
    expect(screen.getByText('4 Hotspur St')).toBeInTheDocument()
    expect(screen.getByText('3 selected · £35.50')).toBeInTheDocument()
    expect(screen.getByText('Tom Hall')).toBeInTheDocument()
    expect(screen.getByText('Customer on payment hold')).toBeInTheDocument()
    expect(screen.getByText('Already invoiced')).toBeInTheDocument()

    await user.click(screen.getByRole('checkbox', { name: 'Include Jo Coates' }))
    expect(screen.getByText('2 selected · £15.50')).toBeInTheDocument()
    await user.click(screen.getByRole('checkbox', { name: 'Include Customer' }))
    await user.click(screen.getByRole('checkbox', { name: 'Include Customer' }))
    await user.click(screen.getByRole('button', { name: 'Continue' }))

    expect(screen.getByText('Create 2 invoices totalling £15.50?')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Back' }))
    expect(screen.getByRole('checkbox', { name: 'Include Jo Coates' })).not.toBeChecked()
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument()
    await user.click(screen.getByRole('switch', { name: 'Send now' }))
    await user.click(screen.getByRole('radio', { name: 'Email' }))
    await user.click(screen.getByRole('button', { name: 'Create invoices' }))
    expect(await screen.findByText('Creating…')).toBeInTheDocument()
    fireEvent.keyDown(document, { key: 'Escape' }) // ignored while creating
    expect(onClose).not.toHaveBeenCalled()
    hold.release()

    expect(await screen.findByText('1 invoices, £15.50 · 2 failed')).toBeInTheDocument()
    expect(screen.getByText(/Invoice INV-2 created but not sent: GHL rejected the message/)).toBeInTheDocument()
    expect(created).toEqual({ date: '2026-10-30', excludeVisitIds: ['v1'], sendNow: true, channel: 'EMAIL' })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.invoices.all })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.debt.all })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.customers.all })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.today.all })
    await user.click(screen.getByRole('button', { name: 'Done' }))
    expect(onClose).toHaveBeenCalled()
  })

  it('creates without sending, and lists a clean result', async () => {
    let created: unknown
    server.use(
      on('post', '/invoices/bulk/preview', () => specJson('/invoices/bulk/preview', 'post', 200, { ...preview, skipped: [] })),
      on('post', '/invoices/bulk', async ({ request }) => {
        created = await request.json()
        return specJson('/invoices/bulk', 'post', 200, { created: [], failed: [], totals: { count: 3, amount: '35.50' } })
      }),
    )
    const { user } = renderWithProviders(<BulkInvoicesModal date="2026-10-30" onClose={vi.fn()} />)
    await user.click(await screen.findByRole('button', { name: 'Continue' }))
    await user.click(screen.getByRole('button', { name: 'Create invoices' }))
    expect(await screen.findByText('3 invoices, £35.50')).toBeInTheDocument()
    expect(screen.queryByText('Skipped')).not.toBeInTheDocument()
    expect(created).toEqual({ date: '2026-10-30', excludeVisitIds: [], sendNow: false })
  })

  it('shows the server error with a CTA and stays on confirm', async () => {
    server.use(
      on('post', '/invoices/bulk/preview', () => specJson('/invoices/bulk/preview', 'post', 200, preview)),
      on('post', '/invoices/bulk', () => apiError(409, 'Messaging is not connected', 'GHL_NOT_CONNECTED')),
    )
    const { user } = renderWithProviders(<BulkInvoicesModal date="2026-10-30" onClose={vi.fn()} />)
    await user.click(await screen.findByRole('button', { name: 'Continue' }))
    await user.click(screen.getByRole('button', { name: 'Create invoices' }))
    expect(await screen.findByText('Messaging is not connected')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Connect messaging' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create invoices' })).toBeInTheDocument()
  })

  it('handles an empty preview, and a preview error with retry', async () => {
    let calls = 0
    server.use(
      on('post', '/invoices/bulk/preview', () => {
        calls += 1
        return calls === 1
          ? apiError(400, 'date is invalid')
          : specJson('/invoices/bulk/preview', 'post', 200, { items: [], skipped: [], totals: { count: 0, amount: '0.00' } })
      }),
    )
    const onClose = vi.fn()
    const { user } = renderWithProviders(<BulkInvoicesModal date="2026-10-30" onClose={onClose} />)
    expect(await screen.findByText('date is invalid')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect(await screen.findByText('No completed visits are waiting for an invoice.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onClose).toHaveBeenCalled()
  })
})

describe('Today’s Work (GAP-014 / GAP-035 / GAP-026)', () => {
  it('maps scheduled vs completed value and a missing technician name', () => {
    const ui = todayRoundToUi(round)
    expect(ui.value).toBe('£80')
    expect(ui.valueCompleted).toBe('£40')
    const legacy = todayRoundToUi({ ...round, scheduledValue: undefined, completedValue: undefined })
    expect(legacy.value).toBe('£40')
    expect(legacy.valueCompleted).toBe('£40')
    expect(todayTechniciansToWorkload(aggregate().technicians)[0]).toMatchObject({ name: '—', initial: '—' })
  })

  it('"Updated HH:mm" comes from generatedAt, else the fetch time', () => {
    const fetched = new Date(2026, 9, 30, 8, 0).getTime()
    expect(formatUpdatedLabel(todayUpdatedAt('2026-10-30T09:41:00', fetched))).toBe('Updated 09:41')
    expect(todayUpdatedAt(null, fetched)).toBe(fetched)
    expect(todayUpdatedAt(undefined, fetched)).toBe(fetched)
    expect(todayUpdatedAt('not a date', fetched)).toBe(fetched)
  })

  it('the rounds table shows the scheduled value with completed value underneath', () => {
    renderWithProviders(
      <table>
        <TodaysWorkRoundsTable
          columns={todaysWorkContent.table.columns}
          emptyLabel="Nothing"
          rows={[todayRoundToUi(round), { ...todayRoundToUi(round), id: 'r2', round: 'Other', valueCompleted: undefined }]}
          selectedRoundId="r1"
          onSelectRound={vi.fn()}
        />
      </table>,
    )
    const row = screen.getByText('Alnwick Fri').closest('tr')!
    expect(within(row).getByText('£80')).toBeInTheDocument()
    expect(within(row).getByText('£40 done')).toBeInTheDocument()
    expect(screen.getAllByText(/done$/)).toHaveLength(1)
  })

  function Screen() {
    return <TodaysWorkScreen interactions={useTodaysWorkInteractions()} />
  }

  it('admins open "Create invoices for today" for the aggregate date', async () => {
    let previewBody: unknown
    server.use(
      on('get', '/today', () => specJson('/today', 'get', 200, aggregate())),
      on('post', '/invoices/bulk/preview', async ({ request }) => {
        previewBody = await request.json()
        return specJson('/invoices/bulk/preview', 'post', 200, preview)
      }),
    )
    const { user } = renderWithProviders(<Screen />)
    expect(await screen.findByText('Updated 09:41')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Create invoices for today' }))
    expect(await screen.findByText('Jo Coates')).toBeInTheDocument()
    expect(previewBody).toEqual({ date: '2026-10-30', excludeVisitIds: [] })
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(screen.queryByText('Jo Coates')).not.toBeInTheDocument())
  })

  it('falls back to today’s date before the aggregate loads, and hides the button from technicians', async () => {
    let previewBody: unknown
    server.use(
      on('get', '/today', async () => {
        await delay('infinite')
        return specJson('/today', 'get', 200, aggregate())
      }),
      on('post', '/invoices/bulk/preview', async ({ request }) => {
        previewBody = await request.json()
        return specJson('/invoices/bulk/preview', 'post', 200, preview)
      }),
    )
    const { user, unmount } = renderWithProviders(<Screen />)
    await user.click(screen.getByRole('button', { name: 'Create invoices for today' }))
    await waitFor(() => expect(previewBody).toEqual({ date: todayIso(), excludeVisitIds: [] }))
    unmount()

    setBootstrap({ canMutate: false, role: 'TECHNICIAN', isTechnician: true })
    renderWithProviders(<Screen />)
    expect(screen.queryByRole('button', { name: 'Create invoices for today' })).not.toBeInTheDocument()
  })
})
