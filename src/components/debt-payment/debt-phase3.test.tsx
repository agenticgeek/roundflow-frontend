import { describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { HttpResponse } from 'msw'
import type { DebtBoardItem } from '@/api/debt.api'
import type { DebtCustomerRecord } from '@/content/debt-payment'
import { DebtPaymentScreen } from '@/components/debt-payment/DebtPaymentScreen'
import { SendPaymentLinkModal } from '@/components/debt-payment/SendPaymentLinkModal'
import { SendPaymentReminderModal } from '@/components/debt-payment/SendPaymentReminderModal'
import { boardItemToRecord, kpisToMetrics } from '@/features/debt/lib/mappers'
import { queryKeys } from '@/lib/query-keys'
import { server } from '@/test/msw/server'
import { apiError, gate, on } from '@/test/msw/typed'
import { renderWithProviders } from '@/test/render'

function boardRow(overrides: Partial<DebtBoardItem> = {}): DebtBoardItem {
  return {
    invoiceId: 'inv1',
    invoiceNumber: 'INV-001',
    amount: 20,
    dueDate: '2026-10-01T00:00:00Z',
    customerId: 'c1',
    customerName: 'Jo Coates',
    addressLine: '4 Hotspur St',
    postcode: 'NE66 1TD',
    paymentMethod: 'BACS',
    lastContactedAt: null,
    badDebt: false,
    holdNextClean: false,
    ...overrides,
  }
}

const record: DebtCustomerRecord = boardItemToRecord(boardRow(), 'INVOICE_SENT')

describe('debt mappers (GAP-026 / GAP-031)', () => {
  it('copes with a held customer without an invoice', () => {
    const held = boardItemToRecord(
      boardRow({ invoiceId: null, invoiceNumber: null, dueDate: null, paymentMethod: null, holdNextClean: true }),
      'ON_HOLD',
    )
    expect(held).toMatchObject({ id: 'customer:c1', invoiceId: undefined, daysOverdue: 0, invoiceDate: '—', paymentMethodCode: null })
  })

  it('captions the outstanding total by customer count', () => {
    const kpis = {
      totalOutstandings: 20,
      totalOutstandingsCount: 1,
      badDebt: 0,
      badDebtCount: 0,
      failedGoCardless: 0,
      dueBeforeClean: 0,
      holdNextClean: 0,
    }
    expect(kpisToMetrics(kpis)[0]!.helper).toBe('Across 1 customer')
    expect(kpisToMetrics({ ...kpis, totalOutstandingsCount: undefined as never })[0]!.helper).toBe('Across 0 customers')
  })
})

describe('SendPaymentLinkModal (GAP-034)', () => {
  it('sends on a channel and names the link expiry', async () => {
    const hold = gate()
    let body: unknown
    server.use(
      on('post', '/debt/{id}/payment-link', async ({ request }) => {
        body = await request.json()
        await hold.wait()
        return HttpResponse.json({ url: 'https://checkout.stripe.com/x', messageId: 'm1', id: 'm1', channel: 'EMAIL', expiresAt: '2026-10-31T12:00:00Z' })
      }),
    )
    const onClose = vi.fn()
    const { user } = renderWithProviders(<SendPaymentLinkModal open record={record} onClose={onClose} />)
    expect((screen.getByLabelText('Message to customer') as HTMLTextAreaElement).value).toContain('Jo')
    await user.click(screen.getByRole('radio', { name: 'Email' }))
    await user.click(screen.getByRole('button', { name: 'Generate & Send Link' }))
    expect(await screen.findByRole('button', { name: 'Sending…' })).toBeDisabled()
    fireEvent.keyDown(document, { key: 'Escape' }) // ignored while sending
    expect(onClose).not.toHaveBeenCalled()
    hold.release()
    expect(await screen.findByText('Payment link sent to Jo Coates')).toBeInTheDocument()
    expect(screen.getByText(/^Secure Stripe checkout link — expires /)).toBeInTheDocument()
    expect(body).toMatchObject({ channel: 'EMAIL' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('shows the link itself without an expiry, and keeps a setup error in the modal', async () => {
    let calls = 0
    server.use(
      on('post', '/debt/{id}/payment-link', () => {
        calls += 1
        if (calls === 1) return apiError(409, 'Connect Stripe first', 'STRIPE_NOT_CONNECTED')
        return HttpResponse.json({ url: 'https://checkout.stripe.com/y', messageId: 'm2', id: 'm2', channel: 'SMS' })
      }),
    )
    const { user } = renderWithProviders(<SendPaymentLinkModal open record={record} onClose={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: 'Generate & Send Link' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Connect Stripe first')
    expect(screen.getByRole('link', { name: 'Connect Stripe' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Generate & Send Link' }))
    expect(await screen.findByText('https://checkout.stripe.com/y')).toBeInTheDocument()
  })

  it('needs a message, and renders nothing without an invoice', async () => {
    const { user } = renderWithProviders(<SendPaymentLinkModal open record={record} onClose={vi.fn()} />)
    await user.clear(screen.getByLabelText('Message to customer'))
    expect(screen.getByText('Enter a message')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Generate & Send Link' })).toBeDisabled()
    const { container } = renderWithProviders(
      <SendPaymentLinkModal open record={{ ...record, invoiceId: undefined }} onClose={vi.fn()} />,
    )
    expect(container).toBeEmptyDOMElement()
  })
})

describe('SendPaymentReminderModal (GAP-034)', () => {
  it('picks a template, sends on a channel and toasts', async () => {
    const hold = gate()
    let body: unknown
    server.use(
      on('post', '/debt/{id}/remind', async ({ request }) => {
        body = await request.json()
        await hold.wait()
        return HttpResponse.json({ id: 'm1', messageId: 'm1', channel: 'WHATSAPP' })
      }),
    )
    const onClose = vi.fn()
    const { user } = renderWithProviders(<SendPaymentReminderModal open record={record} onClose={onClose} />)
    const gentle = (screen.getByLabelText('Message') as HTMLTextAreaElement).value
    await user.click(screen.getByRole('button', { name: 'Template' }))
    await user.click(screen.getByRole('option', { name: 'Final Notice' }))
    expect(screen.getByLabelText('Message')).not.toHaveValue(gentle)
    await user.click(screen.getByRole('radio', { name: 'WhatsApp' }))
    await user.click(screen.getByRole('button', { name: 'Send Reminder' }))
    expect(await screen.findByRole('button', { name: 'Sending…' })).toBeDisabled()
    fireEvent.keyDown(document, { key: 'Escape' }) // ignored while sending
    hold.release()
    expect(await screen.findByText('Reminder sent to Jo Coates')).toBeInTheDocument()
    expect(body).toMatchObject({ channel: 'WHATSAPP' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('keeps a messaging error in the modal, needs a message, and skips a row without an invoice', async () => {
    server.use(on('post', '/debt/{id}/remind', () => apiError(422, 'No mobile number for SMS', 'NO_CONTACT_FOR_CHANNEL')))
    const onClose = vi.fn()
    const { user } = renderWithProviders(<SendPaymentReminderModal open record={record} onClose={onClose} />)
    await user.click(screen.getByRole('button', { name: 'Send Reminder' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('No mobile number for SMS')
    expect(onClose).not.toHaveBeenCalled()
    await user.clear(screen.getByLabelText('Message'))
    expect(screen.getByText('Enter a reminder message')).toBeInTheDocument()
    const { container } = renderWithProviders(
      <SendPaymentReminderModal open record={{ ...record, invoiceId: undefined }} onClose={vi.fn()} />,
    )
    expect(container).toBeEmptyDOMElement()
  })
})

function useBoard(rows: DebtBoardItem[]) {
  const pagination = { page: 1, pageSize: 25, total: rows.length, totalPages: 1 }
  server.use(
    on('get', '/debt/kpis', () =>
      HttpResponse.json({ totalOutstandings: 20, totalOutstandingsCount: 1, badDebt: 0, badDebtCount: 0, failedGoCardless: 0, dueBeforeClean: 0, holdNextClean: 0 }),
    ),
    on('get', '/debt/board', () => HttpResponse.json({ rows, pagination })),
    on('get', '/debt/board/counts', () =>
      HttpResponse.json({ BAD_DEBT: 0, ON_HOLD: 0, FAILED_GC: 0, DUE_BEFORE_CLEAN: 0, SEVEN_DAYS_OVER: 0, FOURTEEN_DAYS_OVER: 0, ALL: rows.length }),
    ),
    on('get', '/rounds', () => HttpResponse.json([])),
    on('get', '/debt/{id}', ({ params }) =>
      HttpResponse.json({
        invoiceId: String(params.id),
        invoiceNumber: 'INV-001',
        amount: 20,
        dueDate: '2026-10-01T00:00:00Z',
        status: 'SENT',
        customerId: 'c1',
        customerName: 'Jo Coates',
        phone: null,
        email: null,
        roundId: null,
        roundName: null,
        nextVisitDate: null,
        mandateId: null,
        mandateStatus: null,
        recentVisits: [],
      }),
    ),
  )
}

describe('DebtPaymentScreen (GAP-027 part 2 / GAP-026)', () => {
  it('marks an invoice paid from the row and from the detail panel', async () => {
    useBoard([boardRow()])
    const bodies: unknown[] = []
    server.use(
      on('post', '/invoices/{id}/mark-paid', async ({ request }) => {
        bodies.push(await request.json())
        return HttpResponse.json({ invoice: { id: 'inv1', status: 'PAID' }, payment: { id: 'pay1' } })
      }),
    )
    const { user } = renderWithProviders(<DebtPaymentScreen />)
    expect(await screen.findByText('Jo Coates')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Mark as paid' }))
    let dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByRole('button', { name: 'Payment method' })).toHaveTextContent('Bank transfer (BACS)')
    await user.click(within(dialog).getByRole('button', { name: 'Mark as paid' }))
    expect(await screen.findByText('Invoice INV-001 marked as paid')).toBeInTheDocument()

    await user.click(screen.getByText(/4 Hotspur St/))
    const markButtons = await screen.findAllByRole('button', { name: 'Mark as paid' })
    await user.click(markButtons.at(-1)!)
    dialog = (await screen.findAllByRole('dialog')).at(-1)!
    await user.click(within(dialog).getByRole('button', { name: 'Mark as paid' }))
    await waitFor(() => expect(bodies).toHaveLength(2))
  })

  it('a held customer without an invoice has no invoice actions', async () => {
    useBoard([boardRow({ invoiceId: null, invoiceNumber: null, dueDate: null, holdNextClean: true })])
    const { user } = renderWithProviders(<DebtPaymentScreen />)
    expect(await screen.findByText('Jo Coates')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Send Reminder' })).toBeDisabled()
    expect(screen.queryByRole('button', { name: 'Mark as paid' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'More options' }))
    expect(await screen.findByRole('button', { name: 'Clear Hold' })).toBeDisabled()
  })

  it('clears a hold and refreshes the work views that show it', async () => {
    useBoard([boardRow({ holdNextClean: true })])
    let holdBody: unknown
    server.use(
      on('patch', '/debt/{id}/hold', async ({ request }) => {
        holdBody = await request.json()
        return HttpResponse.json({ customerId: 'c1', holdNextClean: false, visitsUpdated: 2 })
      }),
    )
    const { user, queryClient } = renderWithProviders(<DebtPaymentScreen />)
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
    expect(await screen.findByText('Jo Coates')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'More options' }))
    await user.click(await screen.findByRole('button', { name: 'Clear Hold' }))
    expect(await screen.findByText('Hold cleared')).toBeInTheDocument()
    expect(holdBody).toMatchObject({ flag: false })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.today.all })
  })
})
