import type { BankDetailsForm } from '@/types/setup-wizard'
import { setupWizardContent } from '@/content/setup-wizard'

/**
 * `BusinessSettings.bankDetails`, read/written via `GET`/`PATCH /settings/business-profile`
 * per the Bank Details handoff. accountName, accountNumber and sortCode are required by
 * the API whenever bankDetails is sent as an object; bankName is optional.
 */
export interface BankDetailsPayload {
  accountName: string
  bankName: string | null
  accountNumber: string
  sortCode: string
}

export const EMPTY_BANK_DETAILS: BankDetailsForm = {
  accountName: '',
  bankName: '',
  accountNumber: '',
  sortCode: '',
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

export function stripSpaces(value: string): string {
  return value.replace(/\s+/g, '')
}

/** "308012" or "30-80-12" typed as the user goes → "30-80-12". */
export function formatSortCode(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 6)
  return digits.match(/.{1,2}/g)?.join('-') ?? digits
}

const SORT_CODE_PATTERN = /^\d{2}-\d{2}-\d{2}$/

export function isBankDetailsBlank(values: BankDetailsForm): boolean {
  return (
    !values.accountName.trim() &&
    !values.bankName.trim() &&
    !values.accountNumber.trim() &&
    !values.sortCode.trim()
  )
}

/** Returns a user-facing error, or null when valid. Fully blank is valid (details are optional). */
export function validateBankDetails(values: BankDetailsForm): string | null {
  const { validation } = setupWizardContent.businessProfile.bankDetails
  if (isBankDetailsBlank(values)) return null
  if (!values.accountName.trim()) return validation.accountNameRequired
  if (!/^\d{8}$/.test(values.accountNumber.trim())) return validation.accountNumberInvalid
  if (!SORT_CODE_PATTERN.test(values.sortCode.trim())) return validation.sortCodeInvalid
  return null
}

export function bankDetailsToForm(raw: unknown): BankDetailsForm {
  if (!raw || typeof raw !== 'object') return EMPTY_BANK_DETAILS
  const record = raw as Record<string, unknown>
  return {
    accountName: asString(record.accountName),
    bankName: asString(record.bankName),
    accountNumber: asString(record.accountNumber),
    sortCode: asString(record.sortCode),
  }
}

/** `null` clears the stored details when every field is blank. */
export function bankDetailsFromForm(values: BankDetailsForm): BankDetailsPayload | null {
  if (isBankDetailsBlank(values)) return null
  return {
    accountName: values.accountName.trim(),
    bankName: values.bankName.trim() || null,
    accountNumber: values.accountNumber.trim(),
    sortCode: values.sortCode.trim(),
  }
}
