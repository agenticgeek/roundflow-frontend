import { describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { HttpResponse } from 'msw'
import type { BulkRecipientsResult, MessageBulkInput, MessageBulkResult } from '@/api/messages.api'
import { MessageCustomersModal } from '@/components/round-planner/MessageCustomersModal'
import { setBootstrap } from '@/test/bootstrap'
import { server } from '@/test/msw/server'
import { apiError, on } from '@/test/msw/typed'
import { renderWithProviders } from '@/test/render'

const round = { id: 'r1', name: 'Alnwick Fri', stopCount: 10, holdCount: 2 }

const template = (id: string, name: string, body: string) => ({
  id, name, body, channel: null, subject: null, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
})

const result = (over: Partial<MessageBulkResult> = {}): MessageBulkResult => ({
  queued: 2, sent: 2, scheduled: 0, skippedOptedOut: 0, skippedNoContact: 0, skippedNoChannel: 0, failed: 0, scheduledFor: null, recipients: [], ...over,
})

const recipients: BulkRecipientsResult = {
  total: 4,
  reachable: 2,
  recipients: [
    { customerId: 'c1', customerName: 'Alice', address: '1 High St', status: 'ok' },
    { customerId: 'c2', customerName: 'Bob', address: '2 High St', status: 'ok' },
    { customerId: 'c3', customerName: 'Opted Out Ltd', address: '3 High St', status: 'opted_out' },
    { customerId: 'c4', customerName: 'No Phone', address: '4 High St', status: 'no_contact' },
  ],
}

function mockApi(reply: () => Response | Promise<Response>, sent: MessageBulkInput[] = [], queries: URL[] = []) {
  server.use(
    on('get', '/settings/message-templates', () =>
      HttpResponse.json([template('t1', 'Weather Delay', 'Hi {{firstName}}, delayed.'), template('t2', 'Reminder', 'See you {{date}}')]),
    ),
    on('get', '/messages/bulk/recipients', ({ request }: { request: Request }) => {
      queries.push(new URL(request.url))
      return HttpResponse.json(recipients)
    }),
    on('post', '/messages/bulk', async ({ request }: { request: Request }) => {
      sent.push((await request.json()) as MessageBulkInput)
      return reply()
    }),
  )
  return sent
}

function renderModal(onClose = vi.fn()) {
  return renderWithProviders(<MessageCustomersModal open round={round} onClose={onClose} />)
}

async function pickTemplate(user: ReturnType<typeof renderModal>['user'], name: string) {
  await waitFor(() => expect(screen.getByLabelText('Message Template')).toBeEnabled())
  await user.click(screen.getByLabelText('Message Template'))
  await user.click(await screen.findByRole('option', { name }))
}

describe('MessageCustomersModal', () => {
  it('offers the real settings templates (no hardcoded ones) and no credit-cost estimate', async () => {
    mockApi(() => HttpResponse.json(result()))
    const { user } = renderModal()
    await waitFor(() => expect(screen.getByLabelText('Message Template')).toBeEnabled())
    await user.click(screen.getByLabelText('Message Template'))
    expect(await screen.findByRole('option', { name: 'Weather Delay' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Reminder' })).toBeInTheDocument()
    expect(screen.queryByText(/credit/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/£/)).not.toBeInTheDocument()
  })

  it('shows the server-confirmed recipient count, never an estimate, and explains who is left out', async () => {
    const queries: URL[] = []
    mockApi(() => HttpResponse.json(result()), [], queries)
    renderModal()
    expect(screen.getByText('Counting recipients…')).toBeInTheDocument()
    expect(await screen.findByText('2 recipients')).toBeInTheDocument()
    expect(screen.getByText(/2 more won’t be messaged/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Send to 2 Customers' })).toBeEnabled()
    expect(queries[0].searchParams.get('roundId')).toBe('r1')
    expect(queries[0].searchParams.get('channel')).toBe('email')
    expect(queries[0].searchParams.get('excludePaymentHold')).toBe('true')
  })

  it('lets the user untick recipients and sends only the chosen customers', async () => {
    const sent = mockApi(() => HttpResponse.json(result({ sent: 1 })))
    const { user } = renderModal()
    await screen.findByText('2 recipients')
    await user.type(screen.getByLabelText('Message'), 'Hello')
    await user.click(screen.getByRole('button', { name: 'Change' }))
    expect(screen.getByRole('checkbox', { name: /Opted Out Ltd/ })).toBeDisabled()
    expect(screen.getByRole('checkbox', { name: /No Phone/ })).toBeDisabled()
    await user.click(screen.getByRole('checkbox', { name: /Bob/ }))
    expect(screen.getByText('1 recipients')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Send to 1 Customers' }))
    await screen.findByText('Sent to 1 customer')
    expect(sent[0].customerIds).toEqual(['c1'])
  })

  it('sends no customerIds when everyone is still selected, and will not send to nobody', async () => {
    const sent = mockApi(() => HttpResponse.json(result()))
    const { user } = renderModal()
    await screen.findByText('2 recipients')
    await user.type(screen.getByLabelText('Message'), 'Hello')
    await user.click(screen.getByRole('button', { name: 'Change' }))
    await user.click(screen.getByRole('checkbox', { name: /Alice/ }))
    await user.click(screen.getByRole('checkbox', { name: /Bob/ }))
    expect(screen.getByRole('button', { name: /Send to 0 Customers/ })).toBeDisabled()
    await user.click(screen.getByRole('checkbox', { name: /Alice/ }))
    await user.click(screen.getByRole('checkbox', { name: /Bob/ }))
    await user.click(screen.getByRole('button', { name: 'Send to 2 Customers' }))
    await screen.findByText('Sent to 2 customers')
    expect(sent[0].customerIds).toBeUndefined()
  })

  it('sends the chosen template body raw (the server renders it), linked to the template, and shows the outcome', async () => {
    const sent = mockApi(() =>
      HttpResponse.json(
        result({
          sent: 7, skippedOptedOut: 1, failed: 1,
          recipients: [
            { customerId: 'c1', customerName: 'Opted Out Ltd', status: 'skipped_opted_out' },
            { customerId: 'c2', customerName: 'Failed Fred', status: 'failed' },
            { customerId: 'c3', customerName: 'Happy Hal', status: 'sent' },
          ],
        }),
      ),
    )
    const onClose = vi.fn()
    const { user } = renderModal(onClose)
    await screen.findByText('2 recipients')
    await pickTemplate(user, 'Weather Delay')
    expect(screen.getByLabelText('Message')).toHaveValue('Hi {{firstName}}, delayed.')
    await user.click(screen.getByRole('button', { name: 'Send to 2 Customers' }))

    expect(await screen.findByText('Sent to 7 customers · 1 opted out · 1 failed')).toBeInTheDocument()
    expect(sent).toEqual([
      { roundId: 'r1', channel: 'email', body: 'Hi {{firstName}}, delayed.', excludePaymentHold: true, templateId: 't1' },
    ])
    expect(screen.getByText('Opted Out Ltd')).toBeInTheDocument()
    expect(screen.getByText('Failed Fred')).toBeInTheDocument()
    expect(screen.queryByText('Happy Hal')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Done' }))
    expect(onClose).toHaveBeenCalled()
  })

  it('does not link a template once the text has been edited, and honours channel and the hold filter', async () => {
    const sent = mockApi(() => HttpResponse.json(result()))
    const { user } = renderModal()
    await screen.findByText('2 recipients')
    await pickTemplate(user, 'Reminder')
    await user.type(screen.getByLabelText('Message'), '!')
    await user.click(screen.getByRole('button', { name: 'WhatsApp' }))
    await user.click(screen.getByRole('button', { name: /Exclude payment hold customers/ }))
    await user.click(await screen.findByRole('button', { name: 'Send to 2 Customers' }))
    await screen.findByText('Sent to 2 customers')
    expect(sent[0]).toMatchObject({ channel: 'whatsapp', body: 'See you {{date}}!', excludePaymentHold: false })
    expect(sent[0].templateId).toBeUndefined()
  })

  it('inserts a variable chip into the message', async () => {
    mockApi(() => HttpResponse.json(result()))
    const { user } = renderModal()
    await user.click(screen.getByRole('button', { name: '{{address}}' }))
    expect(screen.getByLabelText('Message')).toHaveValue('{{address}}')
  })

  it('will not send an empty message', async () => {
    const sent = mockApi(() => HttpResponse.json(result()))
    const { user } = renderModal()
    await user.click(await screen.findByRole('button', { name: 'Send to 2 Customers' }))
    expect(await screen.findByText('Write a message first.')).toBeInTheDocument()
    expect(sent).toHaveLength(0)
  })

  it('schedules for later: sends scheduledFor, and refuses a time that is not in the future', async () => {
    const sent = mockApi(() => HttpResponse.json(result({ sent: 0, scheduled: 2, scheduledFor: '2099-01-01T09:00:00.000Z' })))
    const { user } = renderModal()
    await screen.findByText('2 recipients')
    await user.type(screen.getByLabelText('Message'), 'Hello')
    await user.click(screen.getByRole('button', { name: /Schedule for later/ }))

    await user.click(screen.getByRole('button', { name: 'Schedule for 2 Customers' }))
    expect(await screen.findByText('Pick a time in the future.')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Send at'), { target: { value: '2000-01-01T09:00' } })
    await user.click(screen.getByRole('button', { name: 'Schedule for 2 Customers' }))
    expect(sent).toHaveLength(0)

    fireEvent.change(screen.getByLabelText('Send at'), { target: { value: '2099-01-01T09:00' } })
    await user.click(screen.getByRole('button', { name: 'Schedule for 2 Customers' }))
    expect(await screen.findByText('Scheduled for 2 customers')).toBeInTheDocument()
    expect(sent).toHaveLength(1)
    expect(sent[0].scheduledFor).toBe(new Date('2099-01-01T09:00').toISOString())
  })

  it('explains when messaging is not connected, and keeps the form', async () => {
    mockApi(() => apiError(409, 'GoHighLevel is not connected', 'GHL_NOT_CONNECTED'))
    const { user } = renderModal()
    await screen.findByText('2 recipients')
    await user.type(screen.getByLabelText('Message'), 'Hello')
    await user.click(screen.getByRole('button', { name: 'Send to 2 Customers' }))
    expect(await screen.findByText(/Messaging isn’t connected yet/)).toBeInTheDocument()
    expect(screen.getByLabelText('Message')).toHaveValue('Hello')
  })

  it('shows other errors', async () => {
    mockApi(() => apiError(500, 'Server blew up'))
    const { user } = renderModal()
    await screen.findByText('2 recipients')
    await user.type(screen.getByLabelText('Message'), 'Hello')
    await user.click(screen.getByRole('button', { name: 'Send to 2 Customers' }))
    expect(await screen.findByText('Server blew up')).toBeInTheDocument()
  })

  it('shows an error and blocks sending when the recipients cannot be loaded', async () => {
    server.use(on('get', '/messages/bulk/recipients', () => apiError(500, 'boom')))
    renderModal()
    expect(await screen.findByText('Could not load recipients')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Send to/ })).toBeDisabled()
  })

  it('does nothing for a read-only role', async () => {
    setBootstrap({ canMutate: false })
    const sent = mockApi(() => HttpResponse.json(result()))
    renderModal()
    expect(screen.getByRole('button', { name: /Send to/ })).toBeDisabled()
    expect(sent).toHaveLength(0)
  })

  it('without GoHighLevel: SMS and WhatsApp are disabled with the reason, Email is selected and used', async () => {
    const sent = mockApi(() => HttpResponse.json(result()))
    server.use(
      on('get', '/settings/business-profile', () => HttpResponse.json({ businessName: 'X', channels: { email: true, sms: false, whatsapp: false, calls: true } })),
    )
    const { user } = renderModal()
    const note = await screen.findByText('SMS and WhatsApp need GoHighLevel, which is not connected. Email works without it.')
    expect(screen.getByRole('button', { name: 'SMS' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'WhatsApp' })).toHaveAccessibleDescription(note.textContent!)
    expect(screen.getByRole('button', { name: 'Email' })).toHaveAttribute('aria-pressed', 'true')
    await screen.findByText('2 recipients')
    await user.type(screen.getByLabelText('Message'), 'Hello')
    await user.click(screen.getByRole('button', { name: 'Send to 2 Customers' }))
    await screen.findByText(/Sent to/)
    expect(sent[0]?.channel).toBe('email')
  })

  it('with email off it starts on SMS', async () => {
    mockApi(() => HttpResponse.json(result()))
    server.use(
      on('get', '/settings/business-profile', () => HttpResponse.json({ businessName: 'X', channels: { email: false, sms: true, whatsapp: true, calls: true } })),
    )
    renderModal()
    await waitFor(() => expect(screen.getByRole('button', { name: 'SMS' })).toHaveAttribute('aria-pressed', 'true'))
    expect(screen.getByRole('button', { name: 'Email' })).toBeDisabled()
  })
})
