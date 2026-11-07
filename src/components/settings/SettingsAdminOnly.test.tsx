import { describe, expect, it } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import { HttpResponse } from 'msw'
import { SettingsScreen } from '@/components/settings/SettingsScreen'
import { setBootstrap } from '@/test/bootstrap'
import { server } from '@/test/msw/server'
import { on } from '@/test/msw/typed'
import { renderWithProviders } from '@/test/render'

/** Wave 2B-1: a MANAGER gets 403 ADMIN_ONLY on these actions, so the screen explains and does not offer them. */
describe('Settings for a MANAGER (ADMIN_ONLY)', { timeout: 30_000 }, () => {
  it('Business Profile: edits the other fields, keeps VAT and bank details read-only with a reason, and never sends them', async () => {
    setBootstrap({ role: 'MANAGER' })
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

    const note = screen.getByText('VAT and bank details can only be changed by an administrator. You can still edit the other fields.')
    expect(screen.getByLabelText('VAT number')).toHaveAttribute('readonly')
    expect(screen.getByLabelText('VAT number')).toHaveAccessibleDescription(note.textContent!)
    expect(screen.getByRole('button', { name: 'VAT rate' })).toBeDisabled()

    await user.type(screen.getByLabelText('Town'), 'Alnwick')
    await user.click(screen.getByRole('button', { name: 'Save Changes' }))
    await waitFor(() => expect(body).toBeDefined())
    expect(body).toMatchObject({ town: 'Alnwick', businessName: 'Coates Windows' })
    for (const key of ['bankDetails', 'vatRate', 'vatRegistered', 'vatRegistration']) expect(body).not.toHaveProperty(key)
  })

  it('Payment Setup: no Edit, no connect or disconnect, and says why', async () => {
    setBootstrap({ role: 'MANAGER' })
    server.use(
      on('get', '/settings/payment', () =>
        HttpResponse.json({ stripeConnected: true, gocardlessConnected: false, ghlConnected: false }),
      ),
    )
    const { user } = renderWithProviders(<SettingsScreen />, { route: '/settings' })
    await user.click(screen.getByRole('button', { name: 'Payment Setup' }))
    expect(await screen.findByText('Only an administrator can change payment settings or connect and disconnect Stripe and GoCardless.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument()
    // The connect and disconnect controls are inert: not focusable, not clickable.
    const stripeCard = screen.getByRole('heading', { name: 'Stripe' }).closest('div.rounded-xl') as HTMLElement
    expect(stripeCard.querySelector('[inert]')).not.toBeNull()
  })

  it('Integrations: the messaging card is read-only with the administrator reason', async () => {
    setBootstrap({ role: 'MANAGER' })
    server.use(on('get', '/settings/payment', () => HttpResponse.json({ stripeConnected: false, gocardlessConnected: false, ghlConnected: false })))
    const { user } = renderWithProviders(<SettingsScreen />, { route: '/settings' })
    await user.click(screen.getByRole('button', { name: 'SMS and calling (optional)' }))
    expect(await screen.findByText('Only an administrator can connect or disconnect messaging.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Connect GoHighLevel' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Failed integration messages' })).not.toBeInTheDocument()
  })

  it('Technicians: deactivate stays available, delete is disabled with a reason', async () => {
    setBootstrap({ role: 'MANAGER' })
    server.use(
      on('get', '/settings/technicians', () =>
        HttpResponse.json([
          { id: 't1', name: 'Sam', displayName: 'Sam', phone: '0700', role: 'LEAD', active: true, profileId: 'p1' },
          { id: 't2', name: 'Pat', displayName: 'Pat', phone: '0701', role: 'LEAD', active: true, profileId: null },
        ]),
      ),
    )
    const { user } = renderWithProviders(<SettingsScreen />, { route: '/settings' })
    await user.click(screen.getByRole('button', { name: 'Technician Mgmt' }))
    const note = await screen.findByText('Only an administrator can delete a technician. You can deactivate one instead.')
    const menus = await screen.findAllByRole('button', { name: 'More options' })
    await user.click(menus[0]!)
    expect(screen.getByRole('button', { name: 'Deactivate' })).toBeEnabled()
    await user.click(menus[1]!)
    const del = within(menus[1]!.parentElement!).getByRole('button', { name: 'Delete' })
    expect(del).toBeDisabled()
    expect(del).toHaveAccessibleDescription(note.textContent!)
  })

  it('Email and branding: opens from the sidebar and from /settings/email, read-only for a MANAGER', async () => {
    setBootstrap({ role: 'MANAGER' })
    server.use(
      on('get', '/settings/email', () => HttpResponse.json({ configured: true, enabled: true, paused: false, senderName: 'Coates', sentToday: 0 })),
      on('get', '/settings/business-profile', () => HttpResponse.json({ businessName: 'Coates' })),
    )
    const { user } = renderWithProviders(<SettingsScreen />, { route: '/settings/email' })
    expect(await screen.findByText('Only an administrator can change email settings. You can see them here.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Business Profile' }))
    await user.click(screen.getByRole('button', { name: 'Email and branding' }))
    expect(await screen.findByRole('heading', { name: 'Email and branding', level: 2 })).toBeInTheDocument()
  })

  it('an ADMIN sees none of this', async () => {
    server.use(on('get', '/settings/payment', () => HttpResponse.json({ stripeConnected: true, gocardlessConnected: false, ghlConnected: false })))
    const { user } = renderWithProviders(<SettingsScreen />, { route: '/settings' })
    await user.click(screen.getByRole('button', { name: 'Payment Setup' }))
    expect(await screen.findByRole('button', { name: 'Edit' })).toBeInTheDocument()
    expect(screen.queryByText(/Only an administrator/)).not.toBeInTheDocument()
  })
})
