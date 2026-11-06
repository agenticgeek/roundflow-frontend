import { describe, expect, it } from 'vitest'
import { screen, within } from '@testing-library/react'
import type { InvoiceListRow } from '@/api/invoices.api'
import type { PaymentListRow } from '@/api/payments.api'
import { InvoicesScreen } from '@/components/invoices/InvoicesScreen'
import { statusLabel, statusTone } from '@/features/invoices/lib/list'
import { invoicesContent } from '@/content/invoices'
import { server } from '@/test/msw/server'
import { on, specJson } from '@/test/msw/typed'
import { renderWithProviders } from '@/test/render'

const onePage = { page: 1, pageSize: 25, total: 1, totalPages: 1 }

const payment = (id: string, status: PaymentListRow['status']): PaymentListRow => ({
  id,
  invoiceId: `inv-${id}`,
  invoiceNumber: `INV-${id}`,
  customer: { id: 'c1', name: 'Jo Coates' },
  amount: 20,
  method: 'GOCARDLESS',
  status,
  createdAt: '2026-10-01T00:00:00Z',
  paidAt: null,
  visitId: null,
  visitDate: null,
})

const invoice = (overrides: Partial<InvoiceListRow>): InvoiceListRow => ({
  id: 'i1',
  invoiceNumber: 'INV-1',
  customer: { id: 'c1', name: 'Jo Coates' },
  total: 20,
  status: 'SENT',
  overdue: false,
  issuedAt: '2026-10-01T00:00:00Z',
  dueDate: '2026-10-08T00:00:00Z',
  paidAt: null,
  paymentMethod: 'BACS',
  visitId: null,
  ...overrides,
})

describe('payment status helpers (Wave 2B-1)', () => {
  it('gives the new statuses a tone and a plain-language label', () => {
    expect(statusTone('PROCESSING')).toBe('warning')
    expect(statusTone('REFUNDED')).toBe('neutral')
    expect(statusTone('DISPUTED')).toBe('danger')
    expect(statusLabel(invoicesContent.paymentStatuses, 'PROCESSING')).toBe('Collecting')
    expect(statusLabel(invoicesContent.paymentStatuses, 'REFUNDED')).toBe('Refunded')
    expect(statusLabel(invoicesContent.paymentStatuses, 'DISPUTED')).toBe('Disputed')
  })

  it('falls back to a readable label for a status this version does not know', () => {
    expect(statusLabel(invoicesContent.paymentStatuses, 'CHARGEBACK_PENDING')).toBe('Chargeback pending')
    expect(statusLabel(invoicesContent.paymentStatuses, '')).toBe('—')
  })
})

describe('Payments tab statuses', { timeout: 30_000 }, () => {
  it('shows every status as words, and filters by the new ones', async () => {
    const seen: (string | null)[] = []
    server.use(
      on('get', '/invoices', () => specJson('/invoices', 'get', 200, { rows: [], pagination: onePage })),
      on('get', '/payments', ({ request }) => {
        seen.push(new URL(request.url).searchParams.get('status'))
        return specJson('/payments', 'get', 200, {
          rows: [payment('a', 'PROCESSING'), payment('b', 'REFUNDED'), payment('c', 'DISPUTED'), payment('d', 'OVERDUE')],
          pagination: onePage,
        })
      }),
    )
    const { user } = renderWithProviders(<InvoicesScreen />)
    await user.click(screen.getByRole('tab', { name: 'Payments' }))
    const table = await screen.findByRole('table')
    for (const text of ['Collecting', 'Refunded', 'Disputed', 'Overdue']) {
      expect(within(table).getByText(text)).toBeInTheDocument()
    }

    await user.click(screen.getByRole('button', { name: 'Status' }))
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual(
      expect.arrayContaining(['Collecting', 'Refunded', 'Disputed', 'Overdue']),
    )
    await user.click(screen.getByRole('option', { name: 'Disputed' }))
    await screen.findByRole('table')
    expect(seen).toContain('DISPUTED')
  })
})

describe('Invoices tab overdue flag', { timeout: 30_000 }, () => {
  it('adds an Overdue badge in words to a sent invoice that is past due, and not to others', async () => {
    server.use(
      on('get', '/invoices', () =>
        specJson('/invoices', 'get', 200, {
          rows: [invoice({ id: 'i1', invoiceNumber: 'INV-LATE', overdue: true }), invoice({ id: 'i2', invoiceNumber: 'INV-OK' })],
          pagination: { ...onePage, total: 2 },
        }),
      ),
    )
    renderWithProviders(<InvoicesScreen />)
    const late = (await screen.findByText('INV-LATE')).closest('tr')!
    expect(within(late).getByText('Sent')).toBeInTheDocument()
    expect(within(late).getByText('Overdue')).toBeInTheDocument()
    const ok = screen.getByText('INV-OK').closest('tr')!
    expect(within(ok).queryByText('Overdue')).not.toBeInTheDocument()
  })
})
