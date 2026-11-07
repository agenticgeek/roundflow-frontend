import { describe, expect, it, vi } from 'vitest'
import { HttpResponse, http } from 'msw'
import { screen, waitFor, within } from '@testing-library/react'
import type { InvoiceListRow } from '@/api/invoices.api'
import { InvoicesScreen } from '@/components/invoices/InvoicesScreen'
import { server } from '@/test/msw/server'
import { API, apiError, gate, on, specJson } from '@/test/msw/typed'
import { setBootstrap } from '@/test/bootstrap'
import { renderWithProviders } from '@/test/render'

vi.mock('@/features/invoices/lib/bulk-send', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/invoices/lib/bulk-send')>()),
  BULK_SEND_POLL_MS: 20,
}))

function row(id: string, status: InvoiceListRow['status'] = 'DRAFT'): InvoiceListRow {
  return {
    id,
    invoiceNumber: `INV-${id}`,
    customer: { id: 'c', name: `Cust ${id}` },
    total: 10,
    status,
    overdue: false,
    issuedAt: '2026-10-01T00:00:00Z',
    dueDate: null,
    paidAt: null,
    paymentMethod: null,
    visitId: null,
  }
}

const pagination = (total: number) => ({ page: 1, pageSize: 25, total, totalPages: 1 })

function listHandler(rows: InvoiceListRow[], total = rows.length) {
  return on('get', '/invoices', () => specJson('/invoices', 'get', 200, { rows, pagination: pagination(total) }))
}

function preview(willSend: number, extra: Record<string, unknown> = {}) {
  return HttpResponse.json({
    total: willSend,
    willSend,
    byChannel: {},
    skipped: {},
    truncated: false,
    totalMatching: willSend,
    invoices: [{ id: '2', invoiceNumber: 'INV-2', customerName: 'Cust 2', channel: 'SMS', skip: null }],
    ...extra,
  })
}

/** A batch answer; `done` is derived the way the server does it. */
function batchBody(results: { id: string; status: string; error?: string; code?: string }[]) {
  return HttpResponse.json({
    batchId: 'b',
    total: results.length,
    done: results.every((result) => result.status !== 'QUEUED'),
    counts: {},
    results,
  })
}

const bulk = (path: string) => `${API}/invoices/bulk-send${path}`

async function chooseDraftFilter(user: ReturnType<typeof renderWithProviders>['user']) {
  await user.click(await screen.findByRole('button', { name: 'Status' }))
  await user.click(screen.getByRole('option', { name: 'Draft' }))
}

describe('Invoices bulk send (ACT-01)', () => {
  it('offers Overdue in the status filter and hides bulk actions without a DRAFT view', async () => {
    server.use(listHandler([row('1'), row('2', 'SENT')]))
    const { user } = renderWithProviders(<InvoicesScreen />)
    await screen.findByText('INV-1')
    expect(screen.queryByRole('button', { name: /Send all/ })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Status' }))
    expect(screen.getByRole('option', { name: 'Overdue' })).toBeInTheDocument()
  })

  it('previews, sends all drafts, polls, and retries failures', async () => {
    const startBodies: unknown[] = []
    let polls = 0
    const firstStart = gate()
    const retryStart = gate()
    server.use(
      listHandler([row('1'), row('2'), row('3')], 3),
      http.post(bulk('/preview'), () =>
        preview(2, { byChannel: { SMS: 2, EMAIL: 0 }, skipped: { CUSTOMER_OPTED_OUT: 1, PAID: 0 } }),
      ),
      http.post(bulk(''), async ({ request }) => {
        startBodies.push(await request.json())
        await (startBodies.length === 1 ? firstStart : retryStart).wait()
        return HttpResponse.json({ batchId: `b${startBodies.length}`, queued: 2, skipped: [] }, { status: 202 })
      }),
      http.get(bulk('/b1'), () => {
        polls += 1
        return batchBody(
          polls < 2
            ? [{ id: '1', status: 'SENT' }, { id: '2', status: 'QUEUED' }, { id: '3', status: 'SKIPPED' }]
            : [
                { id: '1', status: 'SENT' },
                { id: '2', status: 'FAILED', error: 'Carrier said no', code: 'GHL_SEND_FAILED' },
                { id: '3', status: 'SKIPPED' },
                { id: 'zz', status: 'FAILED' },
              ],
        )
      }),
      http.get(bulk('/b2'), () => batchBody([{ id: '2', status: 'SENT' }, { id: 'zz', status: 'SENT' }])),
    )
    const { user } = renderWithProviders(<InvoicesScreen />)
    await chooseDraftFilter(user)
    await user.click(await screen.findByRole('button', { name: 'Send all (3)' }))

    const dialog = await screen.findByRole('dialog', { name: 'Send draft invoices' })
    expect(await within(dialog).findByText('2 will be sent')).toBeInTheDocument()
    expect(within(dialog).getByText('SMS', { selector: 'li span' })).toBeInTheDocument()
    expect(within(dialog).queryByText('Email', { selector: 'li span' })).not.toBeInTheDocument()
    expect(within(dialog).getByText('Customer has opted out of messages')).toBeInTheDocument()

    const sendButton = within(dialog).getByRole('button', { name: 'Send 2 invoices' })
    await user.dblClick(sendButton)
    await waitFor(() => expect(startBodies).toHaveLength(1))
    // Locked while the request is in flight: Escape and Cancel do nothing.
    expect(within(dialog).getByRole('button', { name: 'Sending…' })).toBeDisabled()
    await user.keyboard('{Escape}')
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    firstStart.release()
    expect(startBodies[0]).toMatchObject({ status: 'DRAFT', channel: 'EMAIL' })

    expect(await within(dialog).findByRole('status')).toBeInTheDocument()
    expect(await within(dialog).findByText('Finished: 1 sent, 2 failed, 1 skipped.')).toBeInTheDocument()
    expect(within(dialog).getByText(/INV-2/)).toBeInTheDocument()
    expect(within(dialog).getByText(/Carrier said no/)).toBeInTheDocument()
    expect(within(dialog).getByText(/No reason given/)).toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: 'Retry failed (2)' }))
    expect(await within(dialog).findByRole('button', { name: 'Retrying…' })).toBeDisabled()
    retryStart.release()
    expect(await within(dialog).findByText('Finished: 2 sent, 0 failed, 0 skipped.')).toBeInTheDocument()
    expect(startBodies[1]).toMatchObject({ ids: ['2', 'zz'], channel: 'EMAIL' })
    expect(within(dialog).queryByRole('button', { name: /Retry failed/ })).not.toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Close' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('re-checks the preview when the channel changes and sends the chosen channel', async () => {
    const previews: unknown[] = []
    const starts: unknown[] = []
    server.use(
      listHandler([row('1')]),
      http.post(bulk('/preview'), async ({ request }) => {
        previews.push(await request.json())
        return preview(1, { byChannel: { SMS: 1 } })
      }),
      http.post(bulk(''), async ({ request }) => {
        starts.push(await request.json())
        return HttpResponse.json({ batchId: 'b', queued: 1, skipped: [] }, { status: 202 })
      }),
      http.get(bulk('/b'), () => batchBody([{ id: '1', status: 'SENT' }])),
    )
    const { user } = renderWithProviders(<InvoicesScreen />)
    await chooseDraftFilter(user)
    await user.click(await screen.findByRole('button', { name: 'Send all (1)' }))
    const dialog = await screen.findByRole('dialog')
    await within(dialog).findByText('1 will be sent')
    await user.click(within(dialog).getByRole('radio', { name: 'SMS' }))
    await waitFor(() => expect(previews).toHaveLength(2))
    expect(previews[1]).toMatchObject({ channel: 'SMS' })
    await user.click(await within(dialog).findByRole('button', { name: 'Send 1 invoice' }))
    await waitFor(() => expect(starts[0]).toMatchObject({ channel: 'SMS' }))
    await within(dialog).findByText('Finished: 1 sent, 0 failed, 0 skipped.')
  })

  it('selects drafts with an accessible select-all and sends only the selection', async () => {
    const starts: unknown[] = []
    server.use(
      listHandler([row('1'), row('2'), row('3', 'PAID')]),
      http.post(bulk('/preview'), () => preview(1, { byChannel: { SMS: 1 } })),
      http.post(bulk(''), async ({ request }) => {
        starts.push(await request.json())
        return HttpResponse.json({ batchId: 'b', queued: 1, skipped: [] }, { status: 202 })
      }),
      http.get(bulk('/b'), () => batchBody([{ id: '1', status: 'SENT' }])),
    )
    const { user } = renderWithProviders(<InvoicesScreen />)
    const all = (await screen.findByRole('checkbox', { name: 'Select all draft invoices on this page' })) as HTMLInputElement
    expect(screen.queryByRole('checkbox', { name: 'Select invoice INV-3' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Send selected/ })).not.toBeInTheDocument()

    await user.click(screen.getByRole('checkbox', { name: 'Select invoice INV-1' }))
    expect(all.indeterminate).toBe(true)
    expect(screen.getByText('1 selected')).toBeInTheDocument()
    await user.click(all)
    expect(all.checked).toBe(true)
    expect(all.indeterminate).toBe(false)
    await user.click(all)
    expect(all.checked).toBe(false)
    await user.click(all)
    await user.click(screen.getByRole('checkbox', { name: 'Select invoice INV-2' }))
    await user.click(screen.getByRole('button', { name: 'Send selected (1)' }))
    const dialog = await screen.findByRole('dialog')
    await user.click(await within(dialog).findByRole('button', { name: 'Send 1 invoice' }))
    await waitFor(() => expect(starts[0]).toMatchObject({ ids: ['1'] }))
    expect(starts[0]).not.toHaveProperty('status')
  })

  it('sends the drafts of the current view, and warns above the batch limit', async () => {
    const previews: unknown[] = []
    server.use(
      listHandler([row('1')], 800),
      http.post(bulk('/preview'), async ({ request }) => {
        previews.push(await request.json())
        return preview(500, { truncated: true })
      }),
    )
    const { user } = renderWithProviders(<InvoicesScreen />)
    await chooseDraftFilter(user)
    expect(await screen.findByRole('button', { name: 'Send all (800)' })).toBeInTheDocument()
    expect(screen.getByText('A single batch sends up to 500 invoices. Send the rest afterwards.')).toBeInTheDocument()
    await user.type(screen.getByLabelText('Search invoices'), 'zed')
    await waitFor(() => expect(screen.getByRole('button', { name: 'Send all (800)' })).toBeEnabled())
    await user.click(screen.getByRole('button', { name: 'Send all (800)' }))
    const dialog = await screen.findByRole('dialog')
    expect(await within(dialog).findByText(/Only the first 500 will be sent now/)).toBeInTheDocument()
    await waitFor(() => expect(previews.at(-1)).toMatchObject({ status: 'DRAFT', filters: { q: 'zed' } }))
  })

  it('is read-only for users who cannot mutate', async () => {
    setBootstrap({ canMutate: false })
    server.use(listHandler([row('1')]))
    const { user } = renderWithProviders(<InvoicesScreen />)
    await chooseDraftFilter(user)
    await screen.findByText('INV-1')
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Send all/ })).not.toBeInTheDocument()
  })

  it('explains an empty preview and a preview failure', async () => {
    let fail = false
    server.use(
      listHandler([row('1')]),
      http.post(bulk('/preview'), () =>
        fail ? apiError(500, 'nope') : preview(0, { skipped: { NO_CONTACT_FOR_CHANNEL: 1, MYSTERY: 2 } }),
      ),
    )
    const { user } = renderWithProviders(<InvoicesScreen />)
    await chooseDraftFilter(user)
    await user.click(await screen.findByRole('button', { name: 'Send all (1)' }))
    const dialog = await screen.findByRole('dialog')
    expect(await within(dialog).findByText('Nothing can be sent. Check the reasons below.')).toBeInTheDocument()
    expect(within(dialog).getByText('Skipped (MYSTERY)')).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Send 0 invoices' })).toBeDisabled()
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))

    fail = true
    await user.click(screen.getByRole('button', { name: 'Send all (1)' }))
    expect(await screen.findByText('Could not check these invoices.')).toBeInTheDocument()
  })

  it('explains CHANNEL_UNAVAILABLE by reason when the batch cannot start', async () => {
    server.use(
      listHandler([row('1')]),
      http.post(bulk('/preview'), () => preview(1, { byChannel: { EMAIL: 1 } })),
      http.post(bulk(''), () => HttpResponse.json({ error: 'x', code: 'CHANNEL_UNAVAILABLE', reason: 'EMAIL_PAUSED' }, { status: 409 })),
    )
    const { user } = renderWithProviders(<InvoicesScreen />)
    await chooseDraftFilter(user)
    await user.click(await screen.findByRole('button', { name: 'Send all (1)' }))
    const dialog = await screen.findByRole('dialog')
    await user.click(await within(dialog).findByRole('button', { name: 'Send 1 invoice' }))
    expect(await within(dialog).findByText('Email sending is paused')).toBeInTheDocument()
    expect(within(dialog).getByRole('link', { name: 'Open email settings' })).toHaveAttribute('href', '/settings/email')
  })

  it.each([
    ['INVALID_BATCH_SIZE', 'Select between 1 and 500 invoices.', null],
    ['OTHER', 'The batch could not be started.', null],
  ])('shows a clear message when the batch cannot start (%s)', async (code, copy, link) => {
    server.use(
      listHandler([row('1')]),
      http.post(bulk('/preview'), () => preview(1, { byChannel: { SMS: 1 } })),
      http.post(bulk(''), () => apiError(400, 'server words', code)),
    )
    const { user } = renderWithProviders(<InvoicesScreen />)
    await chooseDraftFilter(user)
    await user.click(await screen.findByRole('button', { name: 'Send all (1)' }))
    const dialog = await screen.findByRole('dialog')
    await user.click(await within(dialog).findByRole('button', { name: 'Send 1 invoice' }))
    expect(await within(dialog).findByText(copy)).toBeInTheDocument()
    if (link) expect(within(dialog).getByRole('link', { name: link })).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Send 1 invoice' })).toBeEnabled()
  })

  it('reports queued-time skips and a failed progress request', async () => {
    server.use(
      listHandler([row('1')]),
      http.post(bulk('/preview'), () => preview(1, { byChannel: { SMS: 1 } })),
      http.post(bulk(''), () =>
        HttpResponse.json({ batchId: 'b', queued: 1, skipped: [{ id: '9', reason: 'CUSTOMER_OPTED_OUT' }] }, { status: 202 }),
      ),
      http.get(bulk('/b'), () => apiError(500, 'gone')),
    )
    const { user } = renderWithProviders(<InvoicesScreen />)
    await chooseDraftFilter(user)
    await user.click(await screen.findByRole('button', { name: 'Send all (1)' }))
    const dialog = await screen.findByRole('dialog')
    await user.click(await within(dialog).findByRole('button', { name: 'Send 1 invoice' }))
    expect(await within(dialog).findByText('1 skipped before sending.')).toBeInTheDocument()
    expect(await within(dialog).findByText('Progress could not be loaded. Close this and check the list.')).toBeInTheDocument()
  })
})
