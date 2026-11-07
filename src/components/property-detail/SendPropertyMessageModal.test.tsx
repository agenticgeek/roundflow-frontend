import { describe, expect, it } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { HttpResponse } from 'msw'
import { SendPropertyMessageModal } from '@/components/property-detail/SendPropertyMessageModal'
import { customerDetailToPropertyRecord } from '@/features/customers/lib/mappers'
import { customerDetailFixture } from '@/test/fixtures'
import { server } from '@/test/msw/server'
import { on } from '@/test/msw/typed'
import { renderWithProviders } from '@/test/render'

const property = customerDetailToPropertyRecord(customerDetailFixture())!

function backend(channels: Record<string, boolean>, send?: () => Response) {
  const bodies: unknown[] = []
  server.use(
    on('get', '/settings/business-profile', () => HttpResponse.json({ businessName: 'X', channels })),
    on('post', '/messages/send', async ({ request }) => {
      bodies.push(await request.json())
      return send ? send() : HttpResponse.json({ status: 'sent' })
    }),
  )
  return bodies
}

const open = () => renderWithProviders(<SendPropertyMessageModal open property={property} onClose={() => undefined} />)

describe('SendPropertyMessageModal channels (Wave 2B-2)', { timeout: 30_000 }, () => {
  it('starts on Email when it works, and sends by email', async () => {
    const bodies = backend({ email: true, sms: true, whatsapp: true, calls: true })
    const { user } = open()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Email' })).toHaveAttribute('aria-pressed', 'true'))
    await user.click(screen.getByRole('button', { name: /^Send Email|Send email/i }))
    await waitFor(() => expect(bodies).toEqual([expect.objectContaining({ channel: 'email', propertyId: property.id })]))
  })

  it('without GoHighLevel SMS is disabled with the reason, and Email stays selected', async () => {
    backend({ email: true, sms: false, whatsapp: false, calls: true })
    open()
    const note = await screen.findByText('SMS and WhatsApp need GoHighLevel, which is not connected. Email works without it.')
    const sms = screen.getByRole('button', { name: 'SMS' })
    expect(sms).toBeDisabled()
    expect(sms).toHaveAccessibleDescription(note.textContent!)
    expect(screen.getByRole('button', { name: 'Email' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('with email off it starts on SMS and disables Email with the reason', async () => {
    backend({ email: false, sms: true, whatsapp: true, calls: true })
    open()
    await screen.findByText(/Email is not available right now/)
    await waitFor(() => expect(screen.getByRole('button', { name: 'SMS' })).toHaveAttribute('aria-pressed', 'true'))
    expect(screen.getByRole('button', { name: 'Email' })).toBeDisabled()
  })

  it('shows the plain reason when the channel is unavailable on send', async () => {
    backend(
      { email: true, sms: true, whatsapp: true, calls: true },
      () => HttpResponse.json({ error: 'x', code: 'CHANNEL_UNAVAILABLE', reason: 'EMAIL_ADDRESS_INVALID' }, { status: 409 }),
    )
    const { user } = open()
    await user.click(await screen.findByRole('button', { name: /^Send Email|Send email/i }))
    expect(await screen.findByText('This customer’s email address bounced')).toBeInTheDocument()
  })

  it('shows the server message for any other failure', async () => {
    backend({ email: true, sms: true, whatsapp: true, calls: true }, () => HttpResponse.json({ error: 'Server fell over' }, { status: 500 }))
    const { user } = open()
    await user.click(await screen.findByRole('button', { name: /^Send Email|Send email/i }))
    expect(await screen.findByText('Server fell over')).toBeInTheDocument()
  })
})
