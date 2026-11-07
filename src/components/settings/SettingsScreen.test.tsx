import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { HttpResponse } from 'msw'
import { SettingsScreen } from '@/components/settings/SettingsScreen'
import { server } from '@/test/msw/server'
import { on } from '@/test/msw/typed'
import { renderWithProviders } from '@/test/render'

const originalLocation = window.location

afterEach(() => {
  vi.unstubAllEnvs()
  Object.defineProperty(window, 'location', { configurable: true, value: originalLocation })
})

function paymentSettings() {
  server.use(
    on('get', '/settings/payment', () =>
      HttpResponse.json({ stripeConnected: false, gocardlessConnected: false, ghlConnected: false }),
    ),
  )
}

describe('SettingsScreen', { timeout: 30_000 }, () => {
  it('Stripe connect redirects to Stripe, and shows why when it can’t (no client id)', async () => {
    paymentSettings()
    const assign = vi.fn()
    Object.defineProperty(window, 'location', { configurable: true, value: { ...originalLocation, assign } })
    const { user } = renderWithProviders(<SettingsScreen />, { route: '/settings/integrations' })

    vi.stubEnv('VITE_STRIPE_CONNECT_CLIENT_ID', '')
    // The provider cards render after GET /settings/payment; wait for them explicitly (CI load made 1s too short).
    await user.click(await screen.findByRole('button', { name: 'Connect Stripe' }, { timeout: 10_000 }))
    expect(assign).not.toHaveBeenCalled()
    expect(await screen.findByText(/VITE_STRIPE_CONNECT_CLIENT_ID/, undefined, { timeout: 5_000 })).toBeInTheDocument()

    vi.stubEnv('VITE_STRIPE_CONNECT_CLIENT_ID', 'ca_test')
    await user.click(screen.getByRole('button', { name: 'Connect Stripe' }))
    expect(assign).toHaveBeenCalledWith(expect.stringContaining('https://connect.stripe.com/oauth/authorize?'))
  })

  it('GAP-017: Integrations holds the GoHighLevel messaging card', async () => {
    paymentSettings()
    const { user } = renderWithProviders(<SettingsScreen />, { route: '/settings/integrations' })
    await user.click(screen.getByRole('button', { name: 'SMS and calling (optional)' }))
    expect(screen.getByRole('heading', { name: 'SMS and calling (optional)' })).toBeInTheDocument()
    expect(screen.getByText(/Email is sent by RoundFlow itself/)).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: 'SMS and WhatsApp (GoHighLevel)' })).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: 'Connect GoHighLevel' })).toBeInTheDocument()
  })
})

describe('SettingsScreen sections (GAP-001 / GAP-003 / GAP-008 / GAP-017)', () => {
  it('Business Profile edits and saves the address and VAT rate', async () => {
    let body: Record<string, unknown> | undefined
    server.use(
      on('get', '/settings/business-profile', () => HttpResponse.json({ businessName: 'Coates Windows', vatRate: 20 })),
      on('patch', '/settings/business-profile', async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>
        return HttpResponse.json({ businessName: 'Coates Windows' })
      }),
    )
    const { user } = renderWithProviders(<SettingsScreen />, { route: '/settings' })
    await user.click(await screen.findByRole('button', { name: 'Edit' }))
    await user.type(screen.getByLabelText('Address line 1'), '1 Bondgate')
    await user.type(screen.getByLabelText('Address line 2'), 'Unit 2')
    await user.type(screen.getByLabelText('Town'), 'Alnwick')
    await user.type(screen.getByLabelText('Postcode'), 'ne66 1aa')
    await user.click(screen.getByRole('button', { name: 'VAT rate' }))
    await user.click(screen.getByRole('option', { name: '5%' }))
    await user.click(screen.getByRole('button', { name: 'Save Changes' }))
    await waitFor(() => expect(body).toBeDefined())
    expect(body).toMatchObject({ addressLine1: '1 Bondgate', addressLine2: 'Unit 2', town: 'Alnwick', postcode: 'NE66 1AA', vatRate: 5 })
  })

  it('Payment Setup validates the due days and saves the defaults', async () => {
    let body: Record<string, unknown> | undefined
    server.use(
      on('get', '/settings/payment', () =>
        HttpResponse.json({ stripeConnected: true, gocardlessConnected: false, ghlConnected: false, invoiceDueDays: 14 }),
      ),
      on('patch', '/settings/payment', async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>
        return HttpResponse.json({ stripeConnected: true })
      }),
    )
    const { user } = renderWithProviders(<SettingsScreen />, { route: '/settings' })
    await user.click(screen.getByRole('button', { name: 'Payment Setup' }))
    await user.click(await screen.findByRole('button', { name: 'Edit' }))
    // BUG-05: accept Cheque too, then make it the primary method.
    await user.click(screen.getByRole('checkbox', { name: /Cheque/ }))
    await user.click(screen.getByRole('button', { name: 'Primary payment method' }))
    await user.click(screen.getByRole('option', { name: 'Cheque' }))
    await user.click(screen.getByRole('button', { name: 'Customers without a Direct Debit' }))
    await user.click(screen.getByRole('option', { name: 'Send a card payment link' }))
    const dueDays = screen.getByLabelText('Invoice due after (days)')
    await user.clear(dueDays)
    await user.type(dueDays, '9a5')
    expect(dueDays).toHaveValue('95')
    await user.click(screen.getByRole('button', { name: 'Save Changes' }))
    expect(screen.getByText('Enter a number of days (0–90).')).toBeInTheDocument()
    expect(body).toBeUndefined()
    await user.clear(dueDays)
    await user.type(dueDays, '30')
    await user.click(screen.getByRole('button', { name: 'Save Changes' }))
    await waitFor(() => expect(body).toBeDefined())
    expect(body).toMatchObject({ defaultPaymentMethod: 'CHEQUE', acceptedPaymentMethods: expect.arrayContaining(['CHEQUE']), invoiceDueDays: 30, noDirectDebitAction: 'SEND_PAYMENT_LINK' })
  })

  it('Payment Setup edits the invoice footer and payment terms, validates them, and clears a blank one (GHL-10)', async () => {
    let body: Record<string, unknown> | undefined
    server.use(
      on('get', '/settings/payment', () =>
        HttpResponse.json({ stripeConnected: true, gocardlessConnected: false, ghlConnected: false, invoiceDueDays: 14, invoiceFooter: 'Thank you', paymentTerms: null }),
      ),
      on('patch', '/settings/payment', async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>
        return HttpResponse.json({ stripeConnected: true })
      }),
    )
    const { user } = renderWithProviders(<SettingsScreen />, { route: '/settings' })
    await user.click(screen.getByRole('button', { name: 'Payment Setup' }))
    const footer = await screen.findByLabelText('Invoice footer')
    expect(footer).toHaveValue('Thank you')
    expect(footer).toHaveAttribute('readonly')
    expect(footer).toHaveAccessibleDescription(/Shown at the bottom of every invoice/)
    await user.click(screen.getByRole('button', { name: 'Edit' }))

    fireEvent.change(footer, { target: { value: 'x'.repeat(501) } })
    await user.click(screen.getByRole('button', { name: 'Save Changes' }))
    expect(screen.getByText('Keep the footer under 500 characters.')).toBeInTheDocument()
    expect(footer).toBeInvalid()
    expect(footer).toHaveAccessibleDescription(/Keep the footer under 500 characters/)
    expect(body).toBeUndefined()

    fireEvent.change(footer, { target: { value: '  See you soon  ' } })
    const terms = screen.getByLabelText('Payment terms')
    await user.type(terms, 'Payment due on receipt')
    await user.click(screen.getByRole('button', { name: 'Save Changes' }))
    await waitFor(() => expect(body).toBeDefined())
    expect(body).toMatchObject({ invoiceFooter: 'See you soon', paymentTerms: 'Payment due on receipt' })
    expect(screen.queryByText('Keep the footer under 500 characters.')).not.toBeInTheDocument()

    await user.click(await screen.findByRole('button', { name: 'Edit' }))
    await user.clear(screen.getByLabelText('Invoice footer'))
    fireEvent.change(screen.getByLabelText('Payment terms'), { target: { value: 'y'.repeat(201) } })
    await user.click(screen.getByRole('button', { name: 'Save Changes' }))
    expect(screen.getByText('Keep the payment terms under 200 characters.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByText('Keep the payment terms under 200 characters.')).not.toBeInTheDocument()
  })

  it('Round Settings saves the clean method, reminder and auto-generate', async () => {
    let body: Record<string, unknown> | undefined
    server.use(
      on('get', '/settings/round-settings', () =>
        HttpResponse.json({ preCleanReminders: [{ type: 'EVENING_BEFORE', time: '18:00' }], defaultCleanMethod: 'TRADITIONAL', autoCreateNextVisit: true }),
      ),
      on('patch', '/settings/round-settings', async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>
        return HttpResponse.json({})
      }),
    )
    const { user } = renderWithProviders(<SettingsScreen />, { route: '/settings' })
    await user.click(screen.getByRole('button', { name: 'Round Settings' }))
    await user.click(await screen.findByRole('button', { name: 'Edit' }))
    await user.click(screen.getByRole('button', { name: 'Default clean method' }))
    await user.click(screen.getByRole('option', { name: 'Water-fed pole' }))
    // BUG-01: both reminders can be on, each with its own time.
    await user.click(screen.getByRole('checkbox', { name: /The morning of the clean/ }))
    await user.click(screen.getByRole('button', { name: /The morning of the clean — Reminder time/ }))
    await user.click(screen.getByRole('option', { name: '6:30 AM' }))
    await user.click(screen.getByRole('switch'))
    await user.click(screen.getByRole('button', { name: 'Save Changes' }))
    await waitFor(() => expect(body).toBeDefined())
    expect(body).toMatchObject({ defaultCleanMethod: 'WATER_FED_POLE', autoCreateNextVisit: false,
      preCleanReminders: [
        { type: 'EVENING_BEFORE', time: '18:00' },
        { type: 'MORNING_OF', time: '06:30' },
      ],
    })
  })

  it('SMS Templates point at SMS setup while GoHighLevel is not connected', async () => {
    server.use(
      on('get', '/settings/message-templates', () => HttpResponse.json([])),
      on('get', '/settings/ghl/status', () =>
        HttpResponse.json({ connected: false, method: null, locationId: null, locationName: null, webhookUrl: null, connectedAt: null }),
      ),
    )
    const { user } = renderWithProviders(<SettingsScreen />, { route: '/settings' })
    await user.click(screen.getByRole('button', { name: 'SMS Templates' }))
    await user.click(await screen.findByRole('button', { name: 'Set up SMS' }))
    expect(screen.getByRole('heading', { name: 'SMS and calling (optional)' })).toBeInTheDocument()
  })
})
