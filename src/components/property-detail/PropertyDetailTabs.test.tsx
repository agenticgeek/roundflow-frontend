import { describe, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import { NotesRiskTab, PaymentsTab, VisitHistoryTab } from '@/components/property-detail/PropertyDetailTabs'
import { PinnedPropertyNotes } from '@/components/property-detail/PinnedPropertyNotes'
import {
  customerDetailToPayments,
  customerDetailToPropertyRecord,
  customerDetailToVisits,
  customerListRowToRecord,
  mapVisitStatus,
} from '@/features/customers/lib/mappers'
import { pinnedFromProperty } from '@/features/properties/lib/notes'
import { queryKeys } from '@/lib/query-keys'
import { customerDetailFixture } from '@/test/fixtures'
import { setBootstrap } from '@/test/bootstrap'
import { server } from '@/test/msw/server'
import { apiError, gate, on } from '@/test/msw/typed'
import { renderWithProviders } from '@/test/render'

const detail = customerDetailFixture()
const property = customerDetailToPropertyRecord(detail)!

describe('customers mappers', () => {
  it('Phase 2: maps every visit status, incl. CANCELLED (paused)', () => {
    expect(mapVisitStatus('COMPLETED')).toBe('completed')
    expect(mapVisitStatus('SCHEDULED')).toBe('scheduled')
    expect(mapVisitStatus('IN_PROGRESS')).toBe('in-progress')
    expect(mapVisitStatus('SKIPPED')).toBe('skipped')
    expect(mapVisitStatus('CANCELLED', 'PAUSED')).toBe('cancelled-paused')
    expect(mapVisitStatus('CANCELLED', 'ROUND_CHANGED')).toBe('cancelled')
    expect(mapVisitStatus('SOMETHING_NEW')).toBe('scheduled')
    expect(mapVisitStatus(undefined)).toBe('scheduled')
    expect(customerDetailToVisits(detail).map((visit) => visit.status)).toEqual(['completed', 'cancelled-paused'])
  })

  it('Phase 2: paymentStatus "none" is never shown as paid', () => {
    expect(property.paymentStatus).toBe('none')
    expect(customerListRowToRecord({ customerId: 'c1', paymentStatus: 'none' }).paymentStatus).toBe('none')
    expect(customerDetailToPropertyRecord(customerDetailFixture({ standingInfo: { paymentStatus: 'ON_HOLD' } }))!.serviceStatus).toBe('hold')
  })

  it('GAP-027: a pending BACS payment row can be marked paid', () => {
    expect(customerDetailToPayments(detail)?.[0]?.markPaidPaymentId).toBe('pay1')
  })
})

describe('PaymentsTab (GAP-027)', () => {
  // A row with an invoice is settled through the invoice (part 2); the payment-level
  // confirm is the fallback for a pending BACS / cheque payment without one.
  const withoutInvoice = () => customerDetailToPayments(detail)!.map((row) => ({ ...row, invoiceId: null }))

  it('opens the invoice mark-paid dialog for an unpaid invoice', async () => {
    const { user } = renderWithProviders(<PaymentsTab property={property} payments={customerDetailToPayments(detail)} />)
    await user.click(screen.getByRole('button', { name: 'Mark as paid' }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText('INV-001')).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('marks a pending BACS payment as paid and refreshes the customer', async () => {
    let calledWith: unknown
    server.use(
      on('patch', '/payments/{id}/status', async ({ params, request }) => {
        calledWith = { id: params.id, body: await request.json() }
        return Response.json({ id: params.id, status: 'PAID' })
      }),
    )
    const { user, queryClient } = renderWithProviders(
      <PaymentsTab property={property} payments={withoutInvoice()} />,
    )
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')

    await user.click(screen.getByRole('button', { name: 'Mark as paid' }))
    expect(screen.getByText('Received £20?')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    await user.click(screen.getByRole('button', { name: 'Mark as paid' }))
    await user.click(screen.getByRole('button', { name: 'Yes, mark paid' }))

    expect(await screen.findByText('Payment of £20 marked as paid')).toBeInTheDocument()
    expect(calledWith).toEqual({ id: 'pay1', body: { status: 'PAID' } })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.customers.all })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.invoices.all })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.debt.all })
    expect(screen.queryByText('Received £20?')).not.toBeInTheDocument()
  })

  it('shows the server message when the payment can’t be marked', async () => {
    const hold = gate()
    server.use(
      on('patch', '/payments/{id}/status', async () => {
        await hold.wait()
        return apiError(409, 'Payment is already PAID')
      }),
    )
    const { user } = renderWithProviders(
      <PaymentsTab property={property} payments={withoutInvoice()} />,
    )
    await user.click(screen.getByRole('button', { name: 'Mark as paid' }))
    await user.click(screen.getByRole('button', { name: 'Yes, mark paid' }))
    expect(await screen.findByRole('button', { name: 'Saving…' })).toBeDisabled()
    hold.release()
    expect(await screen.findByText('Payment is already PAID')).toBeInTheDocument()
  })

  it('hides the action from read-only roles', () => {
    setBootstrap({ canMutate: false })
    renderWithProviders(<PaymentsTab property={property} payments={customerDetailToPayments(detail)} />)
    expect(screen.queryByRole('button', { name: 'Mark as paid' })).not.toBeInTheDocument()
  })
})

describe('VisitHistoryTab (Phase 2)', () => {
  it('shows a "cancelled (paused)" chip', () => {
    renderWithProviders(<VisitHistoryTab property={property} visits={customerDetailToVisits(detail)} />)
    expect(screen.getByText('cancelled (paused)')).toBeInTheDocument()
  })
})

describe('NotesRiskTab (GAP-022)', () => {
  it('pins the property’s risk and access notes above the history', () => {
    renderWithProviders(<NotesRiskTab property={property} notes={[]} customerId="c1" />)
    const risk = screen.getByRole('heading', { name: 'Risk Notes' }).closest('article')!
    expect(within(risk).getByText('Dog in garden')).toBeInTheDocument()
    expect(screen.getByText('Gate code 1234')).toBeInTheDocument()
  })

  it('leaves out notes that aren’t set', async () => {
    const { container } = renderWithProviders(<PinnedPropertyNotes pinned={pinnedFromProperty('No access notes', '  ')} />)
    await waitFor(() => expect(container).toBeEmptyDOMElement())
    renderWithProviders(<PinnedPropertyNotes pinned={pinnedFromProperty('Side gate', 'No risk notes')} />)
    expect(screen.getByText('Side gate')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Risk Notes' })).not.toBeInTheDocument()
  })
})
