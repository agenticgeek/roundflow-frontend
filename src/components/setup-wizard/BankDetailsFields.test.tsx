import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '@/test/render'
import { BankDetailsFields } from '@/components/setup-wizard/BankDetailsFields'
import { bankDetailsFromForm, EMPTY_BANK_DETAILS } from '@/lib/bank-details'
import type { BankDetailsForm } from '@/types/setup-wizard'

let latest: BankDetailsForm = EMPTY_BANK_DETAILS

function Harness() {
  const [values, setValues] = useState<BankDetailsForm>(EMPTY_BANK_DETAILS)
  latest = values
  return <BankDetailsFields values={values} onChange={setValues} />
}

describe('BankDetailsFields account name', () => {
  it('keeps the spaces in a multi-word account name', async () => {
    const { user } = renderWithProviders(<Harness />)
    const input = screen.getByPlaceholderText('Account holder name')

    await user.type(input, 'Shine Window Cleaning Ltd')

    expect(input).toHaveValue('Shine Window Cleaning Ltd')
    expect(latest.accountName).toBe('Shine Window Cleaning Ltd')
  })

  it('sends the name trimmed at the ends but with inner spaces intact', async () => {
    const { user } = renderWithProviders(<Harness />)

    await user.type(screen.getByPlaceholderText('Account holder name'), '  J  Smith ')

    expect(bankDetailsFromForm({ ...latest, accountNumber: '12345678', sortCode: '12-34-56' })?.accountName).toBe('J  Smith')
  })
})
