import { describe, expect, it } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { HttpResponse } from 'msw'
import { GenerateInvoiceModal } from '@/components/property-detail/GenerateInvoiceModal'
import type { PropertyVisitRecord } from '@/content/property-detail'
import { customerDetailToPropertyRecord } from '@/features/customers/lib/mappers'
import { customerDetailFixture } from '@/test/fixtures'
import { server } from '@/test/msw/server'
import { on } from '@/test/msw/typed'
import { renderWithProviders } from '@/test/render'

const property = { ...customerDetailToPropertyRecord(customerDetailFixture())!, email: 'jo@example.com' }
const visit = { id: 'v1', visitDate: '1 Oct', price: '£20' } as PropertyVisitRecord

const preview = {
  invoiceNumber: 'INV-1', invoiceDate: '2026-10-01', visitDate: '2026-10-01', dueDate: null, paymentMethod: 'BACS',
  customer: { name: 'Jo', addressLine: '1 High St', postcode: null, email: 'jo@example.com', phone: null },
  business: { name: 'Coates', email: null, phone: null, address: null, vatNumber: null, companyNumber: null, bank: null, paymentTerms: 'Payment due within 7 days', invoiceFooter: null },
  paymentReference: 'INV-1', lineItems: [], subtotal: 20, vatAmount: 0, total: 20, amount: 20, currency: '£',
}

function open(createResponse: Record<string, unknown>) {
  const bodies: unknown[] = []
  server.use(
    on('get', '/invoices/preview', () => HttpResponse.json(preview)),
    on('post', '/invoices', async ({ request }) => {
      bodies.push(await request.json())
      return HttpResponse.json({ id: 'i1', invoiceNumber: 'INV-1', sentToCustomer: false, sentAt: null, ...createResponse }, { status: 201 })
    }),
  )
  const view = renderWithProviders(<GenerateInvoiceModal open property={property} visit={visit} onClose={() => undefined} />)
  return { ...view, bodies }
}

describe('GenerateInvoiceModal email send (Wave 2B-2)', { timeout: 30_000 }, () => {
  it('creates and emails the invoice, and says it was sent', async () => {
    const { user, bodies } = open({ status: 'SENT', emailSent: true, pdfAttached: true })
    await user.click(await screen.findByRole('button', { name: 'Generate & Send' }))
    expect(await screen.findByText('Invoice generated and sent')).toBeInTheDocument()
    expect(bodies).toEqual([expect.objectContaining({ visitId: 'v1', sendEmail: true })])
  })

  it('keeps the draft and explains why the email did not go', async () => {
    const { user } = open({ status: 'DRAFT', emailSent: false, emailError: { code: 'CHANNEL_UNAVAILABLE', message: 'Email sending is paused' } })
    await user.click(await screen.findByRole('button', { name: 'Generate & Send' }))
    expect(await screen.findByText('Invoice saved as a draft. The email was not sent: Email sending is paused')).toBeInTheDocument()
  })

  it('a plain draft (email unticked) keeps the draft toast', async () => {
    const { user } = open({ status: 'DRAFT' })
    await user.click(await screen.findByRole('checkbox'))
    await user.click(await screen.findByRole('button', { name: /Save as draft/ }))
    await waitFor(() => expect(screen.getByText('Invoice saved as draft')).toBeInTheDocument())
  })
})
