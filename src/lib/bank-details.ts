import type { BankDetailsForm } from '@/types/setup-wizard'
import { setupWizardContent } from '@/content/setup-wizard'

/**
 * CONTRACT-DIFF: `BusinessSettings.bankDetails` is a free-form JSON column on the
 * backend and isn't declared on the step-2 / settings write schemas yet. This is
 * the shape we read and write until the OpenAPI spec catches up.
 */
export interface BankDetailsPayload {
  accountName: string
  bankName: string | null
  accountNumber: string
}

export const EMPTY_BANK_DETAILS: BankDetailsForm = {
  accountName: '',
  bankName: '',
  accountNumber: '',
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

export function stripSpaces(value: string): string {
  return value.replace(/\s+/g, '')
}

export function isBankDetailsBlank(values: BankDetailsForm): boolean {
  return (
    !values.accountName.trim() && !values.bankName.trim() && !values.accountNumber.trim()
  )
}

/** Returns a user-facing error, or null when valid. Fully blank is valid (details are optional). */
export function validateBankDetails(values: BankDetailsForm): string | null {
  const { validation } = setupWizardContent.paymentSetup.bankDetails
  if (isBankDetailsBlank(values)) return null
  if (!values.accountName.trim()) return validation.accountNameRequired
  if (!/^\d{8}$/.test(values.accountNumber.trim())) return validation.accountNumberInvalid
  return null
}

export function bankDetailsToForm(raw: unknown): BankDetailsForm {
  if (!raw || typeof raw !== 'object') return EMPTY_BANK_DETAILS
  const record = raw as Record<string, unknown>
  return {
    accountName: asString(record.accountName),
    bankName: asString(record.bankName),
    accountNumber: asString(record.accountNumber),
  }
}

/** `null` clears the stored details when every field is blank. */
export function bankDetailsFromForm(values: BankDetailsForm): BankDetailsPayload | null {
  if (isBankDetailsBlank(values)) return null
  return {
    accountName: values.accountName.trim(),
    bankName: values.bankName.trim() || null,
    accountNumber: values.accountNumber.trim(),
  }
}
