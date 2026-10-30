import { describe, expect, it, vi } from 'vitest'
import { useState } from 'react'
import { HttpResponse } from 'msw'
import { act, fireEvent, screen, waitFor } from '@testing-library/react'
import { invoicesApi, toQueryString, type SendChannel } from '@/api/invoices.api'
import { paymentsApi } from '@/api/payments.api'
import { photosApi, type PhotoRow } from '@/api/photos.api'
import { ChannelPicker, MessagingErrorNotice } from '@/components/messaging/ChannelPicker'
import { MarkInvoicePaidModal } from '@/components/invoices/MarkInvoicePaidModal'
import { defaultManualMethod } from '@/features/invoices/lib/manual-method'
import { PhotoGallery } from '@/components/photos/PhotoGallery'
import { describeMessagingError } from '@/features/messaging/lib/messaging-errors'
import { groupPhotosByVisit, groupPhotosInOrder } from '@/features/photos/lib/group'
import { usePropertyPhotos, useTechnicianPhotos, useVisitPhotos } from '@/features/photos/hooks/usePhotos'
import { useSendInvoiceVia } from '@/features/invoices/hooks/useInvoiceActions'
import { ApiError } from '@/lib/errors'
import { queryKeys } from '@/lib/query-keys'
import { todayIso } from '@/lib/round-dates'
import { server } from '@/test/msw/server'
import { apiError, gate, on, specJson } from '@/test/msw/typed'
import { renderWithProviders } from '@/test/render'

const pagination = { page: 1, pageSize: 24, total: 1, totalPages: 1 }

function photo(overrides: Partial<PhotoRow> = {}): PhotoRow {
  return {
    id: 'ph1',
    type: 'BEFORE',
    url: 'https://signed/ph1.jpg',
    thumbnailUrl: 'https://signed/ph1-thumb.jpg',
    takenAt: '2026-10-30T09:00:00Z',
    visitId: 'v1',
    visitDate: '2026-10-30T00:00:00Z',
    technician: { id: 't1', name: 'Sam' },
    ...overrides,
  }
}

describe('shared API additions', () => {
  it('toQueryString drops empty values', () => {
    expect(toQueryString({})).toBe('')
    expect(toQueryString({ a: 1, b: undefined, c: '', d: null, e: true, f: 'x y' })).toBe('?a=1&e=true&f=x+y')
  })

  it('invoice list / export / bulk / send / mark-paid hit the spec paths', async () => {
    const seen: Record<string, unknown> = {}
    server.use(
      on('get', '/invoices', ({ request }) => {
        seen.list = new URL(request.url).search
        return specJson('/invoices', 'get', 200, { rows: [], pagination })
      }),
      on('get', '/invoices/export.csv', ({ request }) => {
        seen.exportInvoices = new URL(request.url).search
        return new HttpResponse('invoiceNumber\nINV-1', { headers: { 'Content-Type': 'text/csv' } })
      }),
      on('post', '/invoices/bulk/preview', async ({ request }) => {
        seen.preview = await request.json()
        return specJson('/invoices/bulk/preview', 'post', 200, { items: [], skipped: [], totals: { count: 0, amount: '0.00' } })
      }),
      on('post', '/invoices/bulk', async ({ request }) => {
        seen.bulk = await request.json()
        return specJson('/invoices/bulk', 'post', 200, { created: [], failed: [], totals: { count: 0, amount: '0.00' } })
      }),
      on('post', '/invoices/{id}/send', async ({ params, request }) => {
        seen.send = { id: params.id, body: await request.json() }
        return specJson('/invoices/{id}/send', 'post', 200, {
          id: 'inv1', invoiceNumber: 'INV-1', status: 'SENT', sentToCustomer: true, sentAt: null, messageId: 'm1', channel: 'SMS',
        })
      }),
      on('post', '/invoices/{id}/mark-paid', async ({ params, request }) => {
        seen.markPaid = { id: params.id, body: await request.json() }
        return specJson('/invoices/{id}/mark-paid', 'post', 200, { invoice: { id: 'inv1', status: 'PAID' }, payment: { id: 'pay1' } })
      }),
      on('get', '/payments', ({ request }) => {
        seen.payments = new URL(request.url).search
        return specJson('/payments', 'get', 200, { rows: [], pagination })
      }),
      on('get', '/payments/export.csv', () => new HttpResponse('id\np1', { headers: { 'Content-Type': 'text/csv' } })),
    )

    await invoicesApi.list({ status: 'SENT', q: 'Jo', page: 2 })
    await invoicesApi.list()
    expect(seen.list).toBe('')
    const csv = await invoicesApi.exportCsv({ status: 'PAID' })
    expect(await csv.text()).toContain('INV-1')
    expect(seen.exportInvoices).toBe('?status=PAID')
    await invoicesApi.exportCsv()
    await invoicesApi.bulkPreview({ date: '2026-10-30', excludeVisitIds: ['v2'] })
    expect(seen.preview).toEqual({ date: '2026-10-30', excludeVisitIds: ['v2'] })
    await invoicesApi.bulkCreate({ date: '2026-10-30', sendNow: true, channel: 'EMAIL' })
    expect(seen.bulk).toEqual({ date: '2026-10-30', sendNow: true, channel: 'EMAIL' })
    expect((await invoicesApi.send('inv1', { channel: 'SMS', resend: true })).channel).toBe('SMS')
    expect(seen.send).toEqual({ id: 'inv1', body: { channel: 'SMS', resend: true } })
    await invoicesApi.send('inv1')
    expect(seen.send).toEqual({ id: 'inv1', body: {} })
    await invoicesApi.markPaid('inv1', { method: 'CHEQUE', reference: 'CHQ 1', paidAt: '2026-10-30' })
    expect(seen.markPaid).toEqual({ id: 'inv1', body: { method: 'CHEQUE', reference: 'CHQ 1', paidAt: '2026-10-30' } })

    await paymentsApi.list({ method: 'BACS' })
    expect(seen.payments).toBe('?method=BACS')
    await paymentsApi.list()
    expect(await (await paymentsApi.exportCsv({ status: 'PAID' })).text()).toContain('p1')
    await paymentsApi.exportCsv()
  })

  it('photos API hits property / technician / visit galleries', async () => {
    const seen: string[] = []
    server.use(
      on('get', '/properties/{id}/photos', ({ request }) => {
        seen.push(new URL(request.url).pathname + new URL(request.url).search)
        return specJson('/properties/{id}/photos', 'get', 200, { rows: [photo()], pagination })
      }),
      on('get', '/technicians/{id}/photos', ({ request }) => {
        seen.push(new URL(request.url).pathname + new URL(request.url).search)
        return specJson('/technicians/{id}/photos', 'get', 200, { rows: [], pagination })
      }),
      on('get', '/visits/{id}/photos', ({ request }) => {
        seen.push(new URL(request.url).pathname)
        return specJson('/visits/{id}/photos', 'get', 200, { rows: [], pagination })
      }),
    )
    await photosApi.property('p1', { type: 'AFTER', page: 2 })
    await photosApi.property('p1')
    await photosApi.technician('t1', { page: 3 })
    await photosApi.technician('t1')
    await photosApi.visit('v1')
    expect(seen).toEqual([
      '/__rf/properties/p1/photos?type=AFTER&page=2',
      '/__rf/properties/p1/photos',
      '/__rf/technicians/t1/photos?page=3',
      '/__rf/technicians/t1/photos',
      '/__rf/visits/v1/photos',
    ])
  })
})

describe('messaging errors (GAP-034)', () => {
  it('maps each code to a CTA or hint and keeps the server message', () => {
    const stripe = describeMessagingError(new ApiError(409, 'Stripe is not connected', 'STRIPE_NOT_CONNECTED'))
    expect(stripe).toEqual({
      message: 'Stripe is not connected',
      code: 'STRIPE_NOT_CONNECTED',
      hint: 'Payment links need Stripe connected.',
      cta: { label: 'Connect Stripe', to: '/settings/integrations' },
    })
    expect(describeMessagingError(new ApiError(409, 'x', 'GHL_NOT_CONNECTED')).cta?.label).toBe('Connect messaging')
    expect(describeMessagingError(new ApiError(400, 'No email', 'NO_CONTACT_FOR_CHANNEL')).cta).toBeNull()
    expect(describeMessagingError(new ApiError(502, 'GHL said no', 'GHL_SEND_FAILED')).cta?.label).toBe('Check messaging')
    expect(describeMessagingError(new ApiError(409, 'Paid', 'INVOICE_NOT_PAYABLE'))).toEqual({
      message: 'Paid', code: null, hint: null, cta: null,
    })
    expect(describeMessagingError(new Error('boom')).code).toBeNull()
  })

  it('ChannelPicker switches channel and shows the Auto hint', async () => {
    function Harness() {
      const [channel, setChannel] = useState<SendChannel>('AUTO')
      return <ChannelPicker value={channel} onChange={setChannel} />
    }
    const { user } = renderWithProviders(<Harness />)
    expect(screen.getByRole('radio', { name: 'Auto' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByText(/Auto sends an SMS/)).toBeInTheDocument()
    await user.click(screen.getByRole('radio', { name: 'WhatsApp' }))
    expect(screen.getByRole('radio', { name: 'WhatsApp' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.queryByText(/Auto sends an SMS/)).not.toBeInTheDocument()
  })

  it('MessagingErrorNotice renders nothing, a hint, or a CTA link', () => {
    const { rerender } = renderWithProviders(<MessagingErrorNotice error={null} />)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    rerender(<MessagingErrorNotice error={new ApiError(409, 'GHL is not connected', 'GHL_NOT_CONNECTED')} />)
    expect(screen.getByText('GHL is not connected')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Connect messaging' })).toHaveAttribute('href', '/settings/integrations')
    rerender(<MessagingErrorNotice error={new ApiError(400, 'No email on file', 'NO_CONTACT_FOR_CHANNEL')} />)
    expect(screen.getByText(/Pick another channel/)).toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    rerender(<MessagingErrorNotice error={new Error('Plain failure')} />)
    expect(screen.getByText('Plain failure')).toBeInTheDocument()
  })

  it('useSendInvoiceVia sends with the channel and refreshes invoices', async () => {
    server.use(
      on('post', '/invoices/{id}/send', () =>
        specJson('/invoices/{id}/send', 'post', 200, {
          id: 'inv1', invoiceNumber: 'INV-1', status: 'SENT', sentToCustomer: true, sentAt: null, messageId: 'm1', channel: 'EMAIL',
        }),
      ),
    )
    let send: ReturnType<typeof useSendInvoiceVia> | undefined
    function Harness() {
      send = useSendInvoiceVia()
      return null
    }
    const { queryClient } = renderWithProviders(<Harness />)
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
    await act(() => send!.mutateAsync({ invoiceId: 'inv1', input: { channel: 'EMAIL' } }))
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.invoices.all })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.debt.all })
  })
})

describe('MarkInvoicePaidModal (GAP-027 part 2)', () => {
  it('defaults to the invoice method when it can be recorded by hand', () => {
    expect(defaultManualMethod('CHEQUE')).toBe('CHEQUE')
    expect(defaultManualMethod('CASH')).toBe('CASH')
    expect(defaultManualMethod('STRIPE')).toBe('BACS')
    expect(defaultManualMethod(null)).toBe('BACS')
    expect(defaultManualMethod()).toBe('BACS')
  })

  it('records method, reference and date, then refreshes everything that shows the balance', async () => {
    let body: unknown
    const hold = gate()
    server.use(
      on('post', '/invoices/{id}/mark-paid', async ({ request }) => {
        body = await request.json()
        await hold.wait()
        return specJson('/invoices/{id}/mark-paid', 'post', 200, { invoice: { id: 'inv1', status: 'PAID' }, payment: { id: 'pay1' } })
      }),
    )
    const onClose = vi.fn()
    const onPaid = vi.fn()
    const { user, queryClient } = renderWithProviders(
      <MarkInvoicePaidModal
        invoice={{ id: 'inv1', invoiceNumber: 'INV-001', amountLabel: '£20.00', customerName: 'Jo Coates', paymentMethod: 'CHEQUE' }}
        onClose={onClose}
        onPaid={onPaid}
      />,
    )
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
    expect(screen.getByText('Jo Coates · £20.00')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Payment method' })).toHaveTextContent('Cheque')
    await user.click(screen.getByRole('button', { name: 'Payment method' }))
    await user.click(screen.getByRole('option', { name: 'Cash' }))
    await user.type(screen.getByLabelText('Reference'), '  CHQ 000123 ')
    fireEvent.change(screen.getByLabelText('Date received'), { target: { value: '2026-10-29' } })
    await user.click(screen.getByRole('button', { name: 'Mark as paid' }))
    expect(await screen.findByText('Saving…')).toBeInTheDocument()
    fireEvent.keyDown(document, { key: 'Escape' }) // ignored while saving
    expect(onClose).not.toHaveBeenCalled()
    hold.release()

    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(body).toEqual({ method: 'CASH', reference: 'CHQ 000123', paidAt: '2026-10-29' })
    expect(onPaid).toHaveBeenCalledWith({ invoice: { id: 'inv1', status: 'PAID' }, payment: { id: 'pay1' } })
    expect(screen.getByText('Invoice INV-001 marked as paid')).toBeInTheDocument()
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.payments.all })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.today.all })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.dashboard.all })
  })

  it('validates the reference and date, and shows the server error', async () => {
    let body: unknown
    server.use(
      on('post', '/invoices/{id}/mark-paid', async ({ request }) => {
        body = await request.json()
        return apiError(409, 'Invoice is already paid', 'INVOICE_ALREADY_PAID')
      }),
    )
    const onClose = vi.fn()
    const { user } = renderWithProviders(
      <MarkInvoicePaidModal invoice={{ id: 'inv1', invoiceNumber: 'INV-001' }} onClose={onClose} />,
    )
    expect(screen.getByLabelText('Date received')).toHaveValue(todayIso())
    fireEvent.change(screen.getByLabelText('Reference'), { target: { value: 'x'.repeat(101) } })
    expect(screen.getByText('Keep the reference under 100 characters.')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Date received'), { target: { value: '' } })
    expect(screen.getByText('Enter the date the payment was received.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Mark as paid' })).toBeDisabled()
    fireEvent.change(screen.getByLabelText('Reference'), { target: { value: '' } })
    fireEvent.change(screen.getByLabelText('Date received'), { target: { value: '2026-10-30' } })
    await user.click(screen.getByRole('button', { name: 'Mark as paid' }))
    expect(await screen.findByText('Invoice is already paid')).toBeInTheDocument()
    expect(body).toEqual({ method: 'BACS', reference: null, paidAt: '2026-10-30' })
    expect(onClose).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onClose).toHaveBeenCalled()
  })
})

describe('photo galleries (GAP-019)', () => {
  it('groups photos per visit into before / after pairs and property photos', () => {
    const groups = groupPhotosByVisit([
      photo({ id: 'a', type: 'AFTER', technician: null }),
      photo({ id: 'b', type: 'BEFORE' }),
      photo({ id: 'c', type: 'PROPERTY', visitId: null, visitDate: null, technician: null }),
      photo({ id: 'd', type: 'BEFORE', visitId: 'v2', technician: { id: 't2' } }),
    ])
    expect(groups.map((group) => group.key)).toEqual(['v1', 'property', 'v2'])
    expect(groups[0]!.technicianName).toBe('Sam')
    expect(groupPhotosInOrder(groups[0]!).map((row) => row.id)).toEqual(['b', 'a'])
    expect(groups[1]!.other.map((row) => row.id)).toEqual(['c'])
    expect(groups[2]!.technicianName).toBeNull()
  })

  it('shows loading, error with retry, and empty states', async () => {
    const onRetry = vi.fn()
    const props = { onRetry, onPage: vi.fn() }
    const { rerender, user } = renderWithProviders(
      <PhotoGallery data={undefined} isLoading error={null} {...props} />,
    )
    expect(document.querySelector('[aria-busy="true"]')).not.toBeNull()
    rerender(<PhotoGallery data={undefined} isLoading={false} error={new Error('Signing failed')} {...props} />)
    expect(screen.getByText('Photos could not be loaded.')).toBeInTheDocument()
    expect(screen.getByText('Signing failed')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect(onRetry).toHaveBeenCalled()
    rerender(<PhotoGallery data={{ rows: [], pagination }} isLoading={false} error={null} {...props} />)
    expect(screen.getByText(/No photos yet/)).toBeInTheDocument()
    rerender(<PhotoGallery data={undefined} isLoading={false} error={null} {...props} />)
    expect(screen.getByText(/No photos yet/)).toBeInTheDocument()
    rerender(<PhotoGallery data={{ rows: [photo()], pagination }} isLoading={false} error={null} {...props} />)
    expect(screen.queryByRole('button', { name: 'Next' })).not.toBeInTheDocument()
  })

  it('renders pairs, a placeholder for unsigned photos, a lightbox and pagination', async () => {
    const onPage = vi.fn()
    const data = {
      rows: [
        photo({ id: 'b', type: 'BEFORE' }),
        photo({ id: 'a', type: 'AFTER', url: null, thumbnailUrl: 'https://signed/a-thumb.jpg', technician: null }),
        photo({ id: 'x', type: 'AFTER', url: null, thumbnailUrl: null }),
        photo({ id: 'p', type: 'PROPERTY', visitId: null, visitDate: null, technician: null }),
      ],
      pagination: { page: 1, pageSize: 24, total: 30, totalPages: 2 },
    }
    const { user } = renderWithProviders(
      <PhotoGallery data={data} isLoading={false} error={new Error('stale')} onRetry={vi.fn()} onPage={onPage} />,
    )
    expect(screen.getByText('Visit 30 Oct 2026')).toBeInTheDocument()
    expect(screen.getByText('Property photos')).toBeInTheDocument()
    expect(screen.getByText('by Sam')).toBeInTheDocument()
    expect(screen.getAllByText('Photo unavailable')).toHaveLength(1)

    await user.click(screen.getByRole('button', { name: 'Open photo: Before' }))
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveTextContent('1 of 3 · by Sam')
    expect(screen.getByRole('button', { name: 'Previous photo' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Next photo' }))
    expect(screen.getByRole('dialog')).toHaveTextContent('2 of 3')
    expect(screen.getByRole('dialog')).toHaveTextContent('Photo unavailable')
    fireEvent.keyDown(document, { key: 'ArrowRight' })
    expect(screen.getByRole('dialog')).toHaveTextContent('3 of 3')
    expect(screen.getByRole('button', { name: 'Next photo' })).toBeDisabled()
    fireEvent.keyDown(document, { key: 'ArrowRight' })
    fireEvent.keyDown(document, { key: 'ArrowLeft' })
    expect(screen.getByRole('dialog')).toHaveTextContent('2 of 3')
    await user.click(screen.getByRole('button', { name: 'Previous photo' }))
    fireEvent.keyDown(document, { key: 'ArrowLeft' })
    expect(screen.getByRole('dialog')).toHaveTextContent('1 of 3')
    fireEvent.keyDown(document, { key: 'Enter' })
    await user.click(screen.getAllByRole('button', { name: 'Close dialog' }).at(-1)!)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Open photo: Property' }))
    expect(screen.getByRole('dialog')).toHaveTextContent('1 of 1')
    expect(screen.getByRole('dialog')).not.toHaveTextContent('by ')

    await user.click(screen.getByRole('button', { name: 'Next' }))
    expect(onPage).toHaveBeenCalledWith(2)
  })

  it('photo hooks fetch the right gallery and skip without an id', async () => {
    server.use(
      on('get', '/properties/{id}/photos', () => specJson('/properties/{id}/photos', 'get', 200, { rows: [photo()], pagination })),
      on('get', '/technicians/{id}/photos', () => specJson('/technicians/{id}/photos', 'get', 200, { rows: [], pagination })),
      on('get', '/visits/{id}/photos', () => specJson('/visits/{id}/photos', 'get', 200, { rows: [photo()], pagination })),
    )
    const results: Record<string, unknown> = {}
    function Harness({ visitId }: { visitId?: string | null }) {
      results.property = usePropertyPhotos('p1', { type: 'BEFORE' }).data
      results.propertyDefault = usePropertyPhotos('p1').data
      results.technician = useTechnicianPhotos('t1').data
      results.technicianPage = useTechnicianPhotos('t1', 2).data
      const visit = useVisitPhotos(visitId)
      results.visit = visit.data
      results.visitStatus = visit.fetchStatus
      return null
    }
    const { rerender } = renderWithProviders(<Harness visitId={null} />)
    await waitFor(() => expect(results.technician).toBeDefined())
    expect(results.visitStatus).toBe('idle')
    rerender(<Harness visitId="v1" />)
    await waitFor(() => expect(results.visit).toBeDefined())
    expect(results.property).toBeDefined()
    expect(results.propertyDefault).toBeDefined()
    expect(results.technicianPage).toBeDefined()
  })
})
