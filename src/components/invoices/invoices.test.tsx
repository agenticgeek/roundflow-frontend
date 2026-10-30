import { afterEach, describe, expect, it, vi } from 'vitest'
import { HttpResponse } from 'msw'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { Route, Routes } from 'react-router-dom'
import type { InvoiceListRow } from '@/api/invoices.api'
import type { PaymentListRow } from '@/api/payments.api'
import { InvoicesScreen } from '@/components/invoices/InvoicesScreen'
import { SendInvoiceModal } from '@/components/invoices/SendInvoiceModal'
import {
  compactFilters,
  exportFilename,
  formatListDate,
  formatListMoney,
  isOpenInvoice,
  optionLabel,
  statusTone,
} from '@/features/invoices/lib/list'
import { invoicesContent } from '@/content/invoices'
import Invoices from '@/pages/Invoices'
import { appShellContent } from '@/content/app-shell'
import { ROUTES } from '@/config/routes'
import * as download from '@/lib/download'
import { setBootstrap } from '@/test/bootstrap'
import { server } from '@/test/msw/server'
import { apiError, gate, on, specJson } from '@/test/msw/typed'
import { renderWithProviders } from '@/test/render'

function invoiceRow(overrides: Partial<InvoiceListRow> = {}): InvoiceListRow {
  return {
    id: 'inv1',
    invoiceNumber: 'INV-001',
    customer: { id: 'c1', name: 'Jo Coates' },
    total: 20,
    status: 'SENT',
    issuedAt: '2026-10-01T00:00:00Z',
    dueDate: '2026-10-15T00:00:00Z',
    paidAt: null,
    paymentMethod: 'CHEQUE',
    visitId: 'v1',
    ...overrides,
  }
}

function paymentRow(overrides: Partial<PaymentListRow> = {}): PaymentListRow {
  return {
    id: 'pay1',
    customer: { id: 'c1', name: 'Jo Coates' },
    amount: 33,
    method: 'BACS',
    status: 'PAID',
    paidAt: '2026-10-20T00:00:00Z',
    createdAt: '2026-10-19T00:00:00Z',
    visitId: 'v1',
    visitDate: '2026-10-19T00:00:00Z',
    invoiceId: 'inv1',
    invoiceNumber: 'INV-001',
    ...overrides,
  }
}

const onePage = { page: 1, pageSize: 25, total: 2, totalPages: 1 }

afterEach(() => vi.restoreAllMocks())

describe('invoice list helpers (GAP-028)', () => {
  it('formats and classifies', () => {
    expect(statusTone('PAID')).toBe('success')
    expect(statusTone('SOMETHING')).toBe('neutral')
    expect(optionLabel(invoicesContent.paymentMethods, 'BACS')).toBe('Bank transfer')
    expect(optionLabel(invoicesContent.paymentMethods, 'NEW')).toBe('NEW')
    expect(optionLabel(invoicesContent.paymentMethods, null)).toBe('—')
    expect(formatListDate('2026-10-30T10:00:00Z')).toBe('30 Oct 2026')
    expect(formatListDate(null)).toBe('—')
    expect(formatListDate('garbage')).toBe('—')
    expect(formatListMoney(12.5)).toBe('£12.50')
    expect(compactFilters({ a: '', b: undefined, c: 'x', d: 2 })).toEqual({ c: 'x', d: 2 })
    expect(isOpenInvoice('DRAFT')).toBe(true)
    expect(isOpenInvoice('PAID')).toBe(false)
    expect(exportFilename('payments', '2026-10-30')).toBe('payments-2026-10-30.csv')
  })
})

describe('InvoicesScreen (GAP-028)', () => {
  it('lists invoices, filters them, and pages', async () => {
    const searches: string[] = []
    server.use(
      on('get', '/invoices', ({ request }) => {
        const url = new URL(request.url)
        searches.push(url.search)
        const page = Number(url.searchParams.get('page'))
        return specJson('/invoices', 'get', 200, {
          rows: [
            invoiceRow({ invoiceNumber: page === 2 ? 'INV-PAGE2' : 'INV-001' }),
            invoiceRow({ id: 'inv2', invoiceNumber: 'INV-002', status: 'PAID', customer: {}, paidAt: '2026-10-20T00:00:00Z', paymentMethod: null }),
            invoiceRow({ id: 'inv3', invoiceNumber: 'INV-003', status: 'DRAFT' }),
          ],
          pagination: { page, pageSize: 25, total: 60, totalPages: 3 },
        })
      }),
    )
    const { user } = renderWithProviders(<InvoicesScreen />)
    expect(await screen.findByText('INV-001')).toBeInTheDocument()
    const table = screen.getByRole('table')
    expect(within(table).getAllByText('Jo Coates')).toHaveLength(2)
    expect(within(table).getAllByText('—').length).toBeGreaterThan(0)
    expect(within(table).getByText('20 Oct 2026')).toBeInTheDocument()
    expect(within(table).getAllByText('Cheque')).toHaveLength(2)
    expect(screen.getByRole('button', { name: 'Resend' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Send' })).toBeInTheDocument()
    // Paid invoices only offer a preview.
    expect(screen.getAllByRole('button', { name: 'Mark as paid' })).toHaveLength(2)
    expect(searches[0]).toBe('?pageSize=25&page=1')

    await user.click(screen.getByRole('button', { name: 'Next' }))
    expect(await screen.findByText('INV-PAGE2')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Status' }))
    await user.click(screen.getByRole('option', { name: 'Sent' }))
    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-10-01' } })
    fireEvent.change(screen.getByLabelText('To'), { target: { value: '2026-10-31' } })
    await user.type(screen.getByLabelText('Search invoices'), 'Jo')
    await waitFor(() => expect(searches.at(-1)).toBe('?pageSize=25&status=SENT&from=2026-10-01&to=2026-10-31&q=Jo&page=1'))
  })

  it('shows empty, error + retry, and the read-only view', async () => {
    let fail = true
    server.use(
      on('get', '/invoices', () =>
        fail ? apiError(500, 'Invoice list exploded') : specJson('/invoices', 'get', 200, { rows: [], pagination: onePage }),
      ),
    )
    const { user } = renderWithProviders(<InvoicesScreen />)
    expect(await screen.findByText('Invoice list exploded')).toBeInTheDocument()
    fail = false
    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect(await screen.findByText('No invoices match these filters.')).toBeInTheDocument()
  })

  it('hides send / mark paid from read-only users', async () => {
    setBootstrap({ canMutate: false })
    server.use(on('get', '/invoices', () => specJson('/invoices', 'get', 200, { rows: [invoiceRow()], pagination: onePage })))
    renderWithProviders(<InvoicesScreen />)
    expect(await screen.findByText('INV-001')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Resend' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Preview' })).toBeInTheDocument()
  })

  it('previews, sends and marks an invoice paid', async () => {
    let paidBody: unknown
    server.use(
      on('get', '/invoices', () => specJson('/invoices', 'get', 200, { rows: [invoiceRow()], pagination: onePage })),
      on('get', '/invoices/{id}', () => HttpResponse.json({ id: 'inv1', invoiceNumber: 'INV-001', status: 'SENT', amount: 20 })),
      on('post', '/invoices/{id}/send', () =>
        specJson('/invoices/{id}/send', 'post', 200, {
          id: 'inv1', invoiceNumber: 'INV-001', status: 'SENT', sentToCustomer: true, sentAt: null, messageId: 'm1', channel: 'WHATSAPP',
        }),
      ),
      on('post', '/invoices/{id}/mark-paid', async ({ request }) => {
        paidBody = await request.json()
        return specJson('/invoices/{id}/mark-paid', 'post', 200, { invoice: { id: 'inv1' }, payment: { id: 'p1' } })
      }),
    )
    const { user } = renderWithProviders(<InvoicesScreen />)
    await user.click(await screen.findByRole('button', { name: 'Preview' }))
    expect(await screen.findByText('Invoice Preview')).toBeInTheDocument()
    fireEvent.keyDown(document, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByText('Invoice Preview')).not.toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: 'Resend' }))
    expect(screen.getByText('INV-001 to Jo Coates')).toBeInTheDocument()
    await user.click(screen.getByRole('radio', { name: 'WhatsApp' }))
    await user.click(screen.getByRole('button', { name: 'Send invoice' }))
    expect(await screen.findByText('Invoice INV-001 sent by WhatsApp')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Mark as paid' }))
    expect(screen.getByRole('button', { name: 'Payment method' })).toHaveTextContent('Cheque')
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Mark as paid' }))
    expect(await screen.findByText('Invoice INV-001 marked as paid')).toBeInTheDocument()
    expect(paidBody).toMatchObject({ method: 'CHEQUE' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Resend' }))
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('exports invoices and payments as CSV, and shows an export failure', async () => {
    const save = vi.spyOn(download, 'downloadBlob').mockImplementation(() => undefined)
    let exportQuery = ''
    let failPayments = true
    // Held until the test has seen the pending state, so it can't race a fast response.
    let releaseExport!: () => void
    const exportGate = new Promise<void>((resolve) => (releaseExport = resolve))
    const paymentsHold = gate()
    server.use(
      on('get', '/invoices', () => specJson('/invoices', 'get', 200, { rows: [invoiceRow()], pagination: onePage })),
      on('get', '/invoices/export.csv', async ({ request }) => {
        exportQuery = new URL(request.url).search
        await exportGate
        return new HttpResponse('a,b', { headers: { 'Content-Type': 'text/csv' } })
      }),
      on('get', '/payments', ({ request }) => {
        const url = new URL(request.url)
        const page = Number(url.searchParams.get('page'))
        return specJson('/payments', 'get', 200, {
          rows: [
            paymentRow({ invoiceNumber: page === 2 ? 'INV-P2' : 'INV-001' }),
            paymentRow({ id: 'pay2', customer: {}, invoiceNumber: null, paidAt: null, status: 'FAILED', method: 'GOCARDLESS' }),
          ],
          pagination: { page, pageSize: 25, total: 30, totalPages: 2 },
        })
      }),
      on('get', '/payments/export.csv', async () => {
        if (failPayments) return apiError(500, 'Export timed out')
        await paymentsHold.wait()
        return new HttpResponse('x', { headers: { 'Content-Type': 'text/csv' } })
      }),
    )
    const { user } = renderWithProviders(<InvoicesScreen />)
    await screen.findByText('INV-001')
    await user.click(screen.getByRole('button', { name: 'Status' }))
    await user.click(screen.getByRole('option', { name: 'Draft' }))
    await user.click(screen.getByRole('button', { name: 'Export invoices CSV' }))
    expect(await screen.findByRole('button', { name: 'Exporting…' })).toBeDisabled()
    releaseExport()
    expect(await screen.findByText('CSV downloaded')).toBeInTheDocument()
    expect(exportQuery).toBe('?status=DRAFT')
    expect(save).toHaveBeenCalledWith(expect.any(Blob), expect.stringMatching(/^invoices-\d{4}-\d{2}-\d{2}\.csv$/))

    await user.click(screen.getByRole('tab', { name: 'Payments' }))
    expect(await screen.findByText('INV-001')).toBeInTheDocument()
    expect(screen.getByText('GoCardless')).toBeInTheDocument()
    expect(screen.getByText('Failed')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Next' }))
    expect(await screen.findByText('INV-P2')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Method' }))
    await user.click(screen.getByRole('option', { name: 'Cash' }))
    await user.click(screen.getByRole('button', { name: 'Status' }))
    await user.click(screen.getByRole('option', { name: 'Pending' }))
    await user.click(screen.getByRole('button', { name: 'Export payments CSV' }))
    expect(await screen.findByText('Export timed out')).toBeInTheDocument()
    failPayments = false
    await user.click(screen.getByRole('button', { name: 'Export payments CSV' }))
    expect(await screen.findByRole('button', { name: 'Exporting…' })).toBeDisabled()
    paymentsHold.release()
    await waitFor(() => expect(save).toHaveBeenCalledTimes(2))
  })

  it('payments tab: empty and error states', async () => {
    let fail = true
    server.use(
      on('get', '/invoices', () => specJson('/invoices', 'get', 200, { rows: [], pagination: onePage })),
      on('get', '/payments', () => (fail ? apiError(500, 'Payments down') : specJson('/payments', 'get', 200, { rows: [], pagination: onePage }))),
    )
    const { user } = renderWithProviders(<InvoicesScreen />)
    await user.click(screen.getByRole('tab', { name: 'Payments' }))
    expect(await screen.findByText('Payments down')).toBeInTheDocument()
    fail = false
    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect(await screen.findByText('No payments match these filters.')).toBeInTheDocument()
  })
})

describe('SendInvoiceModal (GAP-034)', () => {
  const invoice = { id: 'inv1', invoiceNumber: 'INV-001', customerName: 'Jo' }

  it('offers "Send again" on INVOICE_ALREADY_SENT and resends', async () => {
    const bodies: unknown[] = []
    const hold = gate()
    server.use(
      on('post', '/invoices/{id}/send', async ({ request }) => {
        const body = await request.json()
        bodies.push(body)
        if (bodies.length === 1) return apiError(409, 'Invoice INV-001 was already sent', 'INVOICE_ALREADY_SENT')
        await hold.wait()
        return specJson('/invoices/{id}/send', 'post', 200, {
          id: 'inv1', invoiceNumber: 'INV-001', status: 'SENT', sentToCustomer: true, sentAt: null, messageId: 'm1', channel: 'SMS',
        })
      }),
    )
    const onClose = vi.fn()
    const { user } = renderWithProviders(<SendInvoiceModal invoice={invoice} onClose={onClose} />)
    await user.click(screen.getByRole('button', { name: 'Send invoice' }))
    expect(await screen.findByText('Invoice INV-001 was already sent Send it again?')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Send again' }))
    expect(await screen.findByText('Sending…')).toBeInTheDocument()
    fireEvent.keyDown(document, { key: 'Escape' })
    hold.release()
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
    expect(bodies).toEqual([{ channel: 'AUTO' }, { channel: 'AUTO', resend: true }])
    expect(screen.getByText('Invoice INV-001 sent by SMS')).toBeInTheDocument()
  })

  it('shows the messaging CTA when GHL is not connected', async () => {
    server.use(on('post', '/invoices/{id}/send', () => apiError(409, 'Connect GoHighLevel first', 'GHL_NOT_CONNECTED')))
    const { user } = renderWithProviders(<SendInvoiceModal invoice={invoice} onClose={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: 'Send invoice' }))
    expect(await screen.findByText('Connect GoHighLevel first')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Connect messaging' })).toHaveAttribute('href', ROUTES.settingsIntegrations)
  })
})

describe('Invoices page', () => {
  it('renders the screen in the app shell, with a nav entry, and signs out', async () => {
    server.use(on('get', '/invoices', () => specJson('/invoices', 'get', 200, { rows: [], pagination: onePage })))
    expect(appShellContent.sidebar.nav.some((item) => item.route === ROUTES.invoices)).toBe(true)
    const { user } = renderWithProviders(
      <Routes>
        <Route path={ROUTES.invoices} element={<Invoices />} />
        <Route path={ROUTES.login} element={<p>Login page</p>} />
      </Routes>,
      { route: ROUTES.invoices },
    )
    expect(screen.getByRole('heading', { name: 'Invoices' })).toBeInTheDocument()
    await user.click(screen.getAllByRole('button', { name: appShellContent.sidebar.signOut })[0]!)
    expect(await screen.findByText('Login page')).toBeInTheDocument()
  })
})
