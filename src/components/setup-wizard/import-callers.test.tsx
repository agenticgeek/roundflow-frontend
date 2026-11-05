import { describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '@/test/render'

const mocks = vi.hoisted(() => ({ panelProps: [] as Record<string, unknown>[] }))

// Only the props each caller hands the import panel matter here.
vi.mock('@/components/setup-wizard/ImportPropertiesPanel', () => ({
  ImportPropertiesPanel: (props: Record<string, unknown>) => {
    mocks.panelProps.push(props)
    return <p>import panel</p>
  },
}))
vi.mock('@/features/customers/hooks/useCustomers', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/customers/hooks/useCustomers')>()),
  useCustomers: () => ({
    data: { customers: [{ customerId: 'c1', customerName: 'Jo', paymentStatus: 'none' }], summary: {} },
    isPending: false,
    isFetching: false,
    isError: false,
  }),
}))
vi.mock('@/features/rounds/hooks/useRounds', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/rounds/hooks/useRounds')>()),
  useRounds: () => ({ data: [{ id: 'r6', name: 'Amble 6-weekly', frequency: 'SIX_WEEKLY' }] }),
}))
vi.mock('@/features/settings/hooks/useSettings', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/settings/hooks/useSettings')>()),
  useServiceAreas: () => ({ data: [] }),
  useServices: () => ({ data: [] }),
}))
vi.mock('@/features/properties/hooks/useProperties', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/properties/hooks/useProperties')>()),
  useCreateProperty: () => ({ mutateAsync: vi.fn() }),
}))

const { CustomersScreen } = await import('@/components/customers/CustomersScreen')
const { AddPropertyStep } = await import('@/components/setup-wizard/steps/AddPropertyStep')

describe('CSV import gets each round’s frequency (GAP-009)', () => {
  it('Customers', async () => {
    const { user } = renderWithProviders(<CustomersScreen />)
    expect(screen.getByText('No invoices')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Import from CSV' }))
    expect(mocks.panelProps.at(-1)?.roundFrequencies).toEqual({ r6: 'SIX_WEEKLY' })
  })

  it('Setup wizard', async () => {
    const { user } = renderWithProviders(
      <AddPropertyStep
        initialValues={{ properties: [] } as never}
        areas={[]}
        rounds={[{ id: 'r6', name: 'Amble 6-weekly', frequency: 'SIX_WEEKLY' } as never]}
        serviceAreaOptions={[]}
        roundOptions={[]}
        defaultPaymentMethod="BACS"
        connectedProviders={{ gocardless: false, stripe: false }}
        onAddProperty={vi.fn()}
        onSubmit={vi.fn()}
      />,
    )
    await user.click(screen.getByRole('button', { name: 'Import CSV' }))
    expect(mocks.panelProps.at(-1)?.roundFrequencies).toEqual({ r6: 'SIX_WEEKLY' })
  })
})
