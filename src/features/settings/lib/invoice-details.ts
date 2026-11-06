import type { BusinessSettings } from '@/api/types'
import { settingsContent } from '@/content/settings'

/** Limits the backend enforces on `PATCH /settings/payment`. */
export const INVOICE_FOOTER_MAX = 500
export const PAYMENT_TERMS_MAX = 200

export type InvoiceDetailsForm = { invoiceFooter: string; paymentTerms: string }

type InvoiceDetailsData = Pick<BusinessSettings, 'invoiceFooter' | 'paymentTerms'> | null | undefined

export function invoiceDetailsToForm(data: InvoiceDetailsData): InvoiceDetailsForm {
  return { invoiceFooter: data?.invoiceFooter ?? '', paymentTerms: data?.paymentTerms ?? '' }
}

/** Blank clears the setting (`null`); anything else is sent trimmed. */
export function invoiceDetailsFromForm(values: InvoiceDetailsForm) {
  return {
    invoiceFooter: values.invoiceFooter.trim() || null,
    paymentTerms: values.paymentTerms.trim() || null,
  }
}

export function validateInvoiceDetails(values: InvoiceDetailsForm): Partial<Record<keyof InvoiceDetailsForm, string>> {
  const copy = settingsContent.paymentSetup.invoiceDetails
  const errors: Partial<Record<keyof InvoiceDetailsForm, string>> = {}
  if (values.invoiceFooter.trim().length > INVOICE_FOOTER_MAX) errors.invoiceFooter = copy.footerTooLong
  if (values.paymentTerms.trim().length > PAYMENT_TERMS_MAX) errors.paymentTerms = copy.termsTooLong
  return errors
}
