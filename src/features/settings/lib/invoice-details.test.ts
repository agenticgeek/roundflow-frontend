import { describe, expect, it } from 'vitest'
import {
  INVOICE_FOOTER_MAX,
  PAYMENT_TERMS_MAX,
  invoiceDetailsFromForm,
  invoiceDetailsToForm,
  validateInvoiceDetails,
} from '@/features/settings/lib/invoice-details'

describe('invoice footer and payment terms (GHL-10)', () => {
  it('reads blanks when the backend sends nothing', () => {
    expect(invoiceDetailsToForm(undefined)).toEqual({ invoiceFooter: '', paymentTerms: '' })
    expect(invoiceDetailsToForm({ invoiceFooter: null, paymentTerms: null })).toEqual({ invoiceFooter: '', paymentTerms: '' })
    expect(invoiceDetailsToForm({ invoiceFooter: 'Thanks', paymentTerms: 'Net 7' })).toEqual({ invoiceFooter: 'Thanks', paymentTerms: 'Net 7' })
  })

  it('sends trimmed text, and null to clear a blank field', () => {
    expect(invoiceDetailsFromForm({ invoiceFooter: '  Thanks  ', paymentTerms: '   ' })).toEqual({
      invoiceFooter: 'Thanks',
      paymentTerms: null,
    })
  })

  it('validates the length limits', () => {
    expect(validateInvoiceDetails({ invoiceFooter: 'ok', paymentTerms: 'ok' })).toEqual({})
    expect(validateInvoiceDetails({ invoiceFooter: 'x'.repeat(INVOICE_FOOTER_MAX + 1), paymentTerms: 'y'.repeat(PAYMENT_TERMS_MAX + 1) })).toEqual({
      invoiceFooter: 'Keep the footer under 500 characters.',
      paymentTerms: 'Keep the payment terms under 200 characters.',
    })
  })
})
