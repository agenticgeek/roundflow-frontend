import { describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '@/test/render'
import { AddPropertyStep } from '@/components/setup-wizard/steps/AddPropertyStep'

function renderStep() {
  const onAddProperty = vi.fn()
  const view = renderWithProviders(
    <AddPropertyStep
      initialValues={{ properties: [] } as never}
      areas={[]}
      rounds={[]}
      serviceAreaOptions={[]}
      roundOptions={[]}
      defaultPaymentMethod="CASH"
      connectedProviders={{ gocardless: false, stripe: false }}
      onAddProperty={onAddProperty}
      onSubmit={vi.fn()}
    />,
  )
  return { ...view, onAddProperty }
}

async function fillRequired(user: ReturnType<typeof renderStep>['user']) {
  await user.type(screen.getByPlaceholderText('Postcode'), 'NE65 0AA')
  await user.type(screen.getByPlaceholderText('Address'), '1 High Street')
  await user.type(screen.getByPlaceholderText('Customer name'), 'Jo Bloggs')
  await user.type(screen.getByPlaceholderText('Mobile number'), '07700900123')
  await user.type(screen.getByPlaceholderText('0.00'), '20')
}

describe('Setup wizard: last cleaned date', () => {
  it('is sent with the property', async () => {
    const { user, onAddProperty } = renderStep()
    await fillRequired(user)
    await user.type(screen.getByLabelText('Last cleaned (optional)'), '2026-10-01')
    await user.click(screen.getByRole('button', { name: 'Save property' }))
    expect(onAddProperty).toHaveBeenCalledWith(expect.objectContaining({ lastCleanedDate: '2026-10-01' }))
  })

  it('is left out when blank', async () => {
    const { user, onAddProperty } = renderStep()
    await fillRequired(user)
    await user.click(screen.getByRole('button', { name: 'Save property' }))
    expect(onAddProperty).toHaveBeenCalledTimes(1)
    expect(onAddProperty.mock.calls[0][0]).not.toHaveProperty('lastCleanedDate')
  })
})
