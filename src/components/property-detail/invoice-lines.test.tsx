import { describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { InvoicePreviewModal } from '@/components/property-detail/InvoicePreviewModal'
import { renderWithProviders } from '@/test/render'

// One invoice per property visit: a line per service, each with its own date
// (docs/PROPERTY_STOPS_PLAN_2026-11-19.md §7.5).

const preview = {
  invoiceNumber: 'INV-2026-001',
  invoiceDate: '2026-11-19',
  visitDate: '2026-11-19',
  dueDate: '2026-11-26',
  paymentMethod: 'CASH',
  customer: { name: 'Jo', addressLine: '1 High St', postcode: 'NE1', email: null, phone: null },
  lineItems: [
    { description: 'Window clean — Monday — 2026-11-19', technicianName: 'Sam', amount: 20, visitId: 'v1', date: '2026-11-19' },
    { description: 'Gutter clear — Monday — 2026-11-18', technicianName: 'Sam', amount: 10, visitId: 'v2', date: '2026-11-18' },
  ],
  subtotal: 30,
  vatAmount: 6,
  total: 36,
  amount: 36,
  currency: '£',
  business: { name: 'Shine', email: null, phone: null, address: null, vatNumber: null, companyNumber: null, bank: null, paymentTerms: 'Payment due within 7 days', invoiceFooter: null },
  paymentReference: 'INV-2026-001',
}

describe('invoice preview with several services', () => {
  it('lists every service with its own date', () => {
    renderWithProviders(
      <InvoicePreviewModal open preview={preview as never} visitId="v1" onClose={vi.fn()} onEditDetails={vi.fn()} onGenerate={vi.fn()} />,
    )
    expect(screen.getByText('Window clean — Monday — 2026-11-19')).toBeInTheDocument()
    expect(screen.getByText('Gutter clear — Monday — 2026-11-18')).toBeInTheDocument()
    expect(screen.getByText('Thursday, 19 November 2026')).toBeInTheDocument()
    expect(screen.getByText('Wednesday, 18 November 2026')).toBeInTheDocument()
  })

  it('an older server without line dates shows the visit date on each line', () => {
    const old = { ...preview, lineItems: preview.lineItems.map(({ visitId: _v, date: _d, ...line }) => line) }
    renderWithProviders(
      <InvoicePreviewModal open preview={old as never} visitId="v1" onClose={vi.fn()} onEditDetails={vi.fn()} onGenerate={vi.fn()} />,
    )
    expect(screen.getAllByText('Thursday, 19 November 2026')).toHaveLength(2)
  })
})
