import { describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { HttpResponse } from 'msw'
import { PaymentMethodsField } from '@/components/setup-wizard/PaymentMethodsField'
import { ReminderChecklist } from '@/components/setup-wizard/ReminderChecklist'
import { RoundsStep } from '@/components/setup-wizard/steps/RoundsStep'
import { EditCustomerRecordModal } from '@/components/property-detail/EditCustomerRecordModal'
import { ServicesHistory } from '@/components/property-detail/ServicesHistory'
import { PauseServiceModal } from '@/components/property-detail/PauseServiceModal'
import { SettingsScreen } from '@/components/settings/SettingsScreen'
import { setupWizardContent } from '@/content/setup-wizard'
import { customerDetailToPropertyRecord, mergePropertyIntoCustomerDetail } from '@/features/customers/lib/mappers'
import { useRoundsDraft } from '@/features/setup/hooks/useRoundsDraft'
import { acceptedMethodsToForm, type ReminderFormValues } from '@/features/settings/lib/business-rules'
import { addDays, todayIsoDate } from '@/features/rounds/lib/planner'
import { getTenantTimeZone, isoDateInTenantZone, setTenantTimeZone } from '@/lib/timezone'
import { propertiesApi } from '@/api/properties.api'
import { customerDetailFixture } from '@/test/fixtures'
import { server } from '@/test/msw/server'
import { apiError, on } from '@/test/msw/typed'
import { renderWithProviders } from '@/test/render'

const ALLOWED = new Set([
  'address', 'amount', 'businessName', 'customerName', 'date', 'dueDate', 'firstName',
  'invoiceNumber', 'paymentLink', 'roundName', 'technicianName',
])

describe('message template placeholders (D1)', () => {
  it('uses only the backend’s camelCase tokens in defaults and variable chips', () => {
    const texts: string[] = []
    const walk = (value: unknown) => {
      if (typeof value === 'string') texts.push(value)
      else if (Array.isArray(value)) value.forEach(walk)
      else if (value && typeof value === 'object') Object.values(value).forEach(walk)
    }
    walk(setupWizardContent.smsTemplates.defaults)
    walk(setupWizardContent.messages.catalogue)
    const tokens = texts.flatMap((text) => [...text.matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map((match) => match[1]!))
    expect(tokens.length).toBeGreaterThan(5)
    for (const token of tokens) expect(ALLOWED.has(token)).toBe(true)
    for (const variable of setupWizardContent.messages.variables) expect(ALLOWED.has(variable)).toBe(true)
  })
})

describe('ReminderChecklist (BUG-01)', () => {
  function Host({ onValues }: { onValues: (values: ReminderFormValues) => void }) {
    const [values, setValues] = useState<ReminderFormValues>({
      eveningReminderEnabled: true,
      eveningReminderTime: '19:00',
      morningReminderEnabled: false,
      morningReminderTime: '07:00',
    })
    onValues(values)
    return <ReminderChecklist ariaLabel="Reminders" values={values} onChange={(patch) => setValues((prev) => ({ ...prev, ...patch }))} />
  }

  it('lets both reminders be on, with times only active while ticked, and "Don’t send" is exclusive', async () => {
    let latest!: ReminderFormValues
    const { user } = renderWithProviders(<Host onValues={(values) => (latest = values)} />)
    const evening = screen.getByRole('checkbox', { name: /The evening before/ })
    const morning = screen.getByRole('checkbox', { name: /The morning of/ })
    const none = screen.getByRole('checkbox', { name: /Don’t send reminders/ })
    expect(evening).toBeChecked()
    expect(none).not.toBeChecked()
    expect(screen.getByRole('button', { name: /The morning of the clean — Reminder time/ })).toBeDisabled()

    await user.click(morning)
    expect(latest).toMatchObject({ eveningReminderEnabled: true, morningReminderEnabled: true })
    expect(screen.getByRole('button', { name: /The morning of the clean — Reminder time/ })).toBeEnabled()
    await user.click(screen.getByRole('button', { name: /The evening before — Reminder time/ }))
    await user.click(screen.getByRole('option', { name: '8:00 PM' }))
    expect(latest.eveningReminderTime).toBe('20:00')

    await user.click(none)
    expect(latest).toMatchObject({ eveningReminderEnabled: false, morningReminderEnabled: false })
    expect(none).toBeChecked()
    await user.click(none)
    expect(latest.eveningReminderEnabled).toBe(true)
    await user.click(evening)
    expect(none).toBeChecked()
  })
})

describe('PaymentMethodsField (BUG-05)', () => {
  function Host({ onValues }: { onValues: (values: { acceptedPaymentMethods: string[]; defaultPaymentMethod: string }) => void }) {
    const [values, setValues] = useState({ acceptedPaymentMethods: ['BACS'], defaultPaymentMethod: 'BACS' })
    onValues(values)
    return (
      <PaymentMethodsField
        values={values}
        connections={{ gocardless: false, stripe: true }}
        onChange={(patch) => setValues((prev) => ({ ...prev, ...patch }))}
      />
    )
  }

  it('accepts several methods, tags unconnected providers, keeps one, and moves the primary', async () => {
    let latest!: { acceptedPaymentMethods: string[]; defaultPaymentMethod: string }
    const { user } = renderWithProviders(<Host onValues={(values) => (latest = values)} />)
    expect(screen.getAllByText('Not connected yet')).toHaveLength(1)

    await user.click(screen.getByRole('checkbox', { name: /Direct Debit/ }))
    await user.click(screen.getByRole('checkbox', { name: /Cash/ }))
    expect(latest.acceptedPaymentMethods).toEqual(['GOCARDLESS', 'BACS', 'CASH'])

    await user.click(screen.getByRole('button', { name: 'Primary payment method' }))
    await user.click(screen.getByRole('option', { name: 'Cash' }))
    expect(latest.defaultPaymentMethod).toBe('CASH')

    // Unticking the primary moves it to the first remaining method.
    await user.click(screen.getByRole('checkbox', { name: /Cash/ }))
    expect(latest.defaultPaymentMethod).toBe('GOCARDLESS')
    await user.click(screen.getByRole('checkbox', { name: /Bank transfer/ }))
    // The last method cannot be unticked.
    await user.click(screen.getByRole('checkbox', { name: /Direct Debit/ }))
    expect(latest.acceptedPaymentMethods).toEqual(['GOCARDLESS'])
  })

  it('builds the form list from the API list and always includes the default', () => {
    expect(acceptedMethodsToForm(['CASH'], 'BACS')).toEqual(['BACS', 'CASH'])
    expect(acceptedMethodsToForm(undefined, 'BACS')).toEqual(['BACS'])
    expect(acceptedMethodsToForm([], '')).toEqual([])
  })
})

describe('RoundsStep postcode sectors (BUG-04)', () => {
  it('sends the ticked sectors on add and shows the sectors the server returns', async () => {
    const created: unknown[] = []
    function Host() {
      const draft = useRoundsDraft()
      return (
        <RoundsStep
          areas={[{ id: 'a1', name: 'Alnwick', postcodeSector: 'NE66, NE65' } as never]}
          rounds={[{ id: 'r0', name: 'Old', serviceAreaId: 'a1', defaultDay: 'MON', frequency: 'FOUR_WEEKLY', postcodeSectors: ['NE65'] } as never]}
          workingDays={[]}
          defaultFrequency="FOUR_WEEKLY"
          draft={draft}
          saving={false}
          onCreateRound={async (input) => {
            created.push(input)
            return 'r1'
          }}
          onUpdateRound={async (id, input) => {
            created.push({ id, ...input })
          }}
          onSubmit={() => {}}
        />
      )
    }
    const { user } = renderWithProviders(<Host />)
    expect(screen.getAllByText('NE65').length).toBeGreaterThan(0)
    await user.type(screen.getByPlaceholderText('Round name'), 'Alnwick Wed')
    await user.click(screen.getByRole('button', { name: 'Select a day' }))
    await user.click(screen.getByRole('option', { name: 'Wednesday' }))
    await user.click(screen.getByRole('button', { name: 'NE66', pressed: false }))
    await user.click(screen.getByRole('button', { name: setupWizardContent.rounds.form.actions.add }))
    await waitFor(() => expect(created).toHaveLength(1))
    expect(created[0]).toMatchObject({ name: 'Alnwick Wed', postcodeSectors: ['NE66'] })

    // Editing hydrates the saved sectors.
    await user.click(screen.getByRole('button', { name: setupWizardContent.rounds.areaCard.edit }))
    expect(screen.getByRole('button', { name: 'NE65', pressed: true })).toBeInTheDocument()
  })
})

describe('EditCustomerRecordModal (BUG-08 + changed-only)', () => {
  const base = customerDetailToPropertyRecord(customerDetailFixture())!
  const catalogue = [
    { id: 's1', name: 'Windows', defaultPrice: '20', active: true },
    { id: 's2', name: 'Gutters', defaultPrice: '12', active: true },
  ]

  function mockCommon() {
    server.use(
      on('get', '/settings/payment', () => HttpResponse.json({ stripeConnected: true, gocardlessConnected: true })),
      on('get', '/settings/services', () => HttpResponse.json(catalogue as never)),
    )
  }

  it('does not invent a clean method or payment method and sends nothing it was not asked to', async () => {
    mockCommon()
    const calls: string[] = []
    server.use(
      on('patch', '/customers/{id}', () => {
        calls.push('customer')
        return HttpResponse.json({})
      }),
      on('patch', '/service-plans/{id}', () => {
        calls.push('plan')
        return HttpResponse.json({ id: 'sp1' } as never)
      }),
    )
    const onClose = vi.fn()
    const { user } = renderWithProviders(
      <EditCustomerRecordModal
        open
        property={{ ...base, cleanMethod: '—', paymentMethod: '—', paymentMethodCode: null, servicePlans: [], primaryPlanId: 'sp1' }}
        customerId="c1"
        onClose={onClose}
      />,
    )
    // Both selects offer "Not set" because the plan has neither value yet.
    expect(await screen.findAllByRole('button', { name: 'Not set' })).toHaveLength(2)
    await user.click(screen.getByRole('button', { name: 'Save Changes' }))
    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(calls).toEqual([])
  })

  it('changes services with PUT /properties/:id/services, with a live total and at least one required', async () => {
    mockCommon()
    let body: unknown
    server.use(
      on('put', '/properties/{id}/services' as never, async ({ request }: { request: Request }) => {
        body = await request.json()
        return HttpResponse.json({ propertyId: 'p1', servicePlans: [], totalPrice: 12, added: ['s2'], removed: ['s1'], cancelledVisits: 0 })
      }),
    )
    const onClose = vi.fn()
    const { user } = renderWithProviders(
      <EditCustomerRecordModal
        open
        property={{
          ...base,
          servicePlans: [
            { id: 'sp1', serviceId: 's1', serviceName: 'Windows', frequency: '', price: '£20', status: 'active', nextDue: '', lastCompleted: '', paymentMethod: '', pauseWindow: null, isPrimary: true, values: { price: 20, cleaningFrequency: null, paymentMethod: null, cleanMethod: null } },
          ],
        }}
        customerId="c1"
        onClose={onClose}
      />,
    )
    expect(await screen.findByText('Total per visit: £20.00')).toBeInTheDocument()
    await user.click(screen.getByRole('checkbox', { name: /Gutters/ }))
    expect(screen.getByText('Total per visit: £32.00')).toBeInTheDocument()
    await user.click(screen.getByRole('checkbox', { name: /Windows/ }))
    expect(screen.getByText('Total per visit: £12.00')).toBeInTheDocument()
    await user.click(screen.getByRole('checkbox', { name: /Gutters/ }))
    await user.click(screen.getByRole('button', { name: 'Save Changes' }))
    expect(await screen.findByText('Pick at least one service.')).toBeInTheDocument()

    await user.click(screen.getByRole('checkbox', { name: /Gutters/ }))
    const price = screen.getByLabelText(/Gutters Price/)
    await user.clear(price)
    await user.type(price, '15')
    await user.click(screen.getByRole('button', { name: 'Save Changes' }))
    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(body).toEqual({ serviceIds: ['s2'], prices: { s2: 15 } })
  })
})

describe('ServicesHistory', () => {
  it('lists changes newest first and pages', async () => {
    server.use(
      on('get', '/properties/{id}/services/history' as never, ({ request }: { request: Request }) => {
        const page = Number(new URL(request.url).searchParams.get('page'))
        return HttpResponse.json({
          rows: [
            {
              id: `h${page}`,
              changedAt: '2026-11-02T10:00:00Z',
              actorId: 'u1',
              actorRole: 'ADMIN',
              oldServices: page === 1 ? [] : [{ servicePlanId: 'x', serviceId: 's1', serviceName: 'Windows', price: 20 }],
              newServices: [{ servicePlanId: 'y', serviceId: 's2', serviceName: `Gutters ${page}`, price: 12 }],
              added: [],
              removed: [],
            },
          ],
          pagination: { page, pageSize: 20, total: 2, totalPages: 2 },
        })
      }),
    )
    const { user } = renderWithProviders(<ServicesHistory propertyId="p1" />)
    expect(await screen.findByText(/Gutters 1/)).toBeInTheDocument()
    expect(screen.getByText(/No services/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Next' }))
    expect(await screen.findByText(/Gutters 2/)).toBeInTheDocument()
  })

  it('shows the empty and error states', async () => {
    server.use(
      on('get', '/properties/{id}/services/history' as never, () =>
        HttpResponse.json({ rows: [], pagination: { page: 1, pageSize: 20, total: 0, totalPages: 1 } }),
      ),
    )
    const first = renderWithProviders(<ServicesHistory propertyId="p1" />)
    expect(await screen.findByText('No service changes yet.')).toBeInTheDocument()
    first.unmount()
    server.use(on('get', '/properties/{id}/services/history' as never, () => apiError(500, 'History down') as never))
    renderWithProviders(<ServicesHistory propertyId="p2" />)
    expect(await screen.findByText('History down')).toBeInTheDocument()
  })
})

describe('GET /properties/:id', () => {
  it('merges the property’s own data over the customer detail', async () => {
    server.use(
      on('get', '/properties/{id}' as never, () =>
        HttpResponse.json({
          id: 'p2', customerId: 'c1', propertyName: null, addressLine: '9 Second St', postcode: 'NE66 2BB', propertyType: null,
          status: 'ACTIVE', accessNotes: null, riskNotes: null, serviceAreaId: 'a1', serviceAreaName: 'A', roundId: 'r2', roundName: 'Second round',
          assignedTechnicianId: null, assignedTechnicianName: 'Sam',
          customer: { id: 'c1', name: 'Jo', phone: null, landline: null, email: null, status: 'ACTIVE', paymentMethod: null, badDebt: false },
          servicePlans: [{ id: 'sp9', serviceId: 's1', serviceName: 'Windows', price: 30, cleanMethod: null, paymentMethod: 'CASH', cleaningFrequency: 'EIGHT_WEEKLY', status: 'ACTIVE', nextDueDate: '2026-12-01', lastCompleted: null, pauseStartDate: null, pauseEndDate: null, isPrimary: true }],
          pause: { state: 'NONE', pauseStartDate: null, pauseEndDate: null }, paymentStatus: 'UNPAID', amountDue: 30, nextVisit: null,
        }),
      ),
    )
    const property = await propertiesApi.get('p2')
    const record = customerDetailToPropertyRecord(mergePropertyIntoCustomerDetail(customerDetailFixture(), property))!
    expect(record).toMatchObject({ id: 'p2', fullAddress: '9 Second St, NE66 2BB', roundLabel: 'Second round', price: '£30', technician: 'Sam', paymentMethodCode: 'CASH' })
    expect(record.servicePlans?.[0]?.serviceId).toBe('s1')
  })
})

describe('pause dates', () => {
  it('blocks a start date in the past inline', async () => {
    const property = customerDetailToPropertyRecord(customerDetailFixture())!
    const { user } = renderWithProviders(<PauseServiceModal open property={property} planId="sp1" onClose={vi.fn()} />)
    const start = screen.getAllByDisplayValue(todayIsoDate())[0]!
    expect(start).toHaveAttribute('min', todayIsoDate())
    await user.click(screen.getByRole('checkbox'))
    // Force a past start (the browser min only guides the picker).
    const { fireEvent } = await import('@testing-library/react')
    fireEvent.change(start, { target: { value: addDays(todayIsoDate(), -3) } })
    await user.click(screen.getByRole('button', { name: 'Pause Service' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('start today or later')
  })
})

describe('business time zone', () => {
  it('formats "today" in the tenant zone and falls back to London for an unknown one', () => {
    const instant = new Date('2026-06-30T23:30:00Z')
    setTenantTimeZone('Europe/London')
    expect(isoDateInTenantZone(instant)).toBe('2026-07-01')
    setTenantTimeZone('America/New_York')
    expect(isoDateInTenantZone(instant)).toBe('2026-06-30')
    setTenantTimeZone('Not/AZone')
    expect(getTenantTimeZone()).toBe('Europe/London')
    setTenantTimeZone(null)
    expect(getTenantTimeZone()).toBe('Europe/London')
  })
})

describe('Service catalogue delete confirmation (D10)', () => {
  it('asks first, and only deletes after the confirmation', async () => {
    let deleted = ''
    server.use(
      on('get', '/settings/services', () => HttpResponse.json([{ id: 's1', name: 'Windows', defaultPrice: '20', active: true, category: 'WINDOW_CLEANING' }] as never)),
      on('delete', '/settings/services/{id}', ({ params }) => {
        deleted = String(params.id)
        return new HttpResponse(null, { status: 204 })
      }),
    )
    const { user } = renderWithProviders(<SettingsScreen />, { route: '/settings' })
    await user.click(screen.getByRole('button', { name: 'Service Catalogue' }))
    await user.click(await screen.findByRole('button', { name: 'Delete' }))
    expect(deleted).toBe('')
    expect(screen.getByText('Delete this service?')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Keep' }))
    expect(deleted).toBe('')
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    await user.click(screen.getByRole('button', { name: 'Yes, delete' }))
    await waitFor(() => expect(deleted).toBe('s1'))
  })
})
