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
  sortCode: string
  accountNumber: string
}

export const EMPTY_BANK_DETAILS: BankDetailsForm = {
  accountName: '',
  bankName: '',
  sortCode: '',
  accountNumber: '',
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

/** Digits only → `12-34-56` (partial input keeps partial dashes). */
export function formatSortCode(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 6)
  return digits.replace(/(\d{2})(?=\d)/g, '$1-')
}

export function isBankDetailsBlank(values: BankDetailsForm): boolean {
  return (
    !values.accountName.trim() &&
    !values.bankName.trim() &&
    !values.sortCode.trim() &&
    !values.accountNumber.trim()
  )
}

/** Returns a user-facing error, or null when valid. Fully blank is valid (details are optional). */
export function validateBankDetails(values: BankDetailsForm): string | null {
  const { validation } = setupWizardContent.paymentSetup.bankDetails
  if (isBankDetailsBlank(values)) return null
  if (!values.accountName.trim()) return validation.accountNameRequired
  if (values.sortCode.replace(/\D/g, '').length !== 6) return validation.sortCodeInvalid
  if (!/^\d{8}$/.test(values.accountNumber.trim())) return validation.accountNumberInvalid
  return null
}

export function bankDetailsToForm(raw: unknown): BankDetailsForm {
  if (!raw || typeof raw !== 'object') return EMPTY_BANK_DETAILS
  const record = raw as Record<string, unknown>
  return {
    accountName: asString(record.accountName),
    bankName: asString(record.bankName),
    sortCode: formatSortCode(asString(record.sortCode)),
    accountNumber: asString(record.accountNumber),
  }
}

/** `null` clears the stored details when every field is blank. */
export function bankDetailsFromForm(values: BankDetailsForm): BankDetailsPayload | null {
  if (isBankDetailsBlank(values)) return null
  return {
    accountName: values.accountName.trim(),
    bankName: values.bankName.trim() || null,
    sortCode: formatSortCode(values.sortCode),
    accountNumber: values.accountNumber.trim(),
  }
}
