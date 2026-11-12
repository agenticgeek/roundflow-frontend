import { describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { HttpResponse } from 'msw'
import type { MessageBulkInput, MessageBulkResult } from '@/api/messages.api'
import { BulkMessageModal } from '@/components/dashboard/BulkMessageModal'
import { server } from '@/test/msw/server'
import { apiError, on } from '@/test/msw/typed'
import { renderWithProviders } from '@/test/render'

const template = (id: string, name: string, body: string) => ({
  id, name, body, channel: null, subject: null, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
})

const result = (over: Partial<MessageBulkResult> = {}): MessageBulkResult => ({
  queued: 5, sent: 5, scheduled: 0, skippedOptedOut: 0, skippedNoContact: 0, skippedNoChannel: 0, failed: 0, scheduledFor: null, recipients: [], ...over,
})

function mockApi(reply: () => Response | Promise<Response>, sent: MessageBulkInput[] = [], templates = [template('t1', 'Weather Delay', 'Hi {{firstName}}, delayed.')]) {
  server.use(
    on('get', '/rounds', () =>
      HttpResponse.json([{ id: 'r1', name: 'Alnwick Fri', propertyCount: 7, status: 'ACTIVE' }] as never),
    ),
    on('get', '/settings/message-templates', () => HttpResponse.json(templates)),
    on('get', '/messages/bulk/recipients', () =>
      HttpResponse.json({ total: 7, reachable: 5, recipients: [] }),
    ),
    on('post', '/messages/bulk', async ({ request }: { request: Request }) => {
      sent.push((await request.json()) as MessageBulkInput)
      return reply()
    }),
  )
  return sent
}

function renderModal(onClose = vi.fn()) {
  return renderWithProviders(<BulkMessageModal open onClose={onClose} />)
}

describe('BulkMessageModal', () => {
  it('uses the real round and template, and the server-confirmed recipient count (no credit cost)', async () => {
    mockApi(() => HttpResponse.json(result()))
    renderModal()
    expect(await screen.findByText('Recipients: 5 customers')).toBeInTheDocument()
    expect(screen.getByText(/2 more won’t be messaged/)).toBeInTheDocument()
    expect(screen.getByDisplayValue('Hi {{firstName}}, delayed.')).toBeInTheDocument()
    expect(screen.queryByText(/credit/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/£/)).not.toBeInTheDocument()
  })

  it('sends the template body linked to its id, then shows the per-recipient result', async () => {
    const sent = mockApi(() =>
      HttpResponse.json(
        result({
          skippedOptedOut: 1, skippedNoContact: 1,
          recipients: [{ customerId: 'c1', customerName: 'Opted Out Ltd', status: 'skipped_opted_out' }],
        }),
      ),
    )
    const onClose = vi.fn()
    const { user } = renderModal(onClose)
    await screen.findByText('Recipients: 5 customers')
    await user.click(screen.getByRole('button', { name: 'Send Message' }))
    expect(await screen.findByText('Sent to 5 customers · 1 opted out · 1 with no contact details')).toBeInTheDocument()
    expect(screen.getByText('Opted Out Ltd')).toBeInTheDocument()
    expect(sent).toEqual([
      { roundId: 'r1', channel: 'email', body: 'Hi {{firstName}}, delayed.', excludePaymentHold: true, templateId: 't1' },
    ])
    await user.click(screen.getByRole('button', { name: 'Done' }))
    expect(onClose).toHaveBeenCalled()
  })

  it('schedules for real: needs a future time and sends scheduledFor', async () => {
    const sent = mockApi(() => HttpResponse.json(result({ sent: 0, scheduled: 5 })))
    const { user } = renderModal()
    await screen.findByText('Recipients: 5 customers')
    await user.click(screen.getByLabelText('Schedule'))
    await user.click(screen.getByRole('button', { name: 'Schedule Message' }))
    expect(await screen.findByText('Pick a time in the future.')).toBeInTheDocument()
    expect(sent).toHaveLength(0)

    fireEvent.change(screen.getByLabelText('Send at'), { target: { value: '2099-01-01T09:00' } })
    await user.click(screen.getByRole('button', { name: 'Schedule Message' }))
    expect(await screen.findByText('Scheduled for 5 customers')).toBeInTheDocument()
    expect(sent[0].scheduledFor).toBe(new Date('2099-01-01T09:00').toISOString())
  })

  it('explains a missing GHL connection and other errors', async () => {
    mockApi(() => apiError(409, 'GoHighLevel is not connected', 'GHL_NOT_CONNECTED'))
    const { user } = renderModal()
    await screen.findByText('Recipients: 5 customers')
    await user.click(screen.getByRole('button', { name: 'Send Message' }))
    expect(await screen.findByText(/Messaging isn’t connected yet/)).toBeInTheDocument()

    server.use(on('post', '/messages/bulk', () => apiError(500, 'Server blew up')))
    await user.click(screen.getByRole('button', { name: 'Send Message' }))
    expect(await screen.findByText('Server blew up')).toBeInTheDocument()
  })

  it('cannot send without a template', async () => {
    mockApi(() => HttpResponse.json(result()), [], [])
    renderModal()
    await waitFor(() => expect(screen.getByText('No message templates yet — add one in Settings.')).toBeInTheDocument())
    expect(screen.getByRole('button', { name: 'Send Message' })).toBeDisabled()
  })

  it('sends by SMS when email is not available', async () => {
    const sent = mockApi(() => HttpResponse.json(result()))
    server.use(
      on('get', '/settings/business-profile', () => HttpResponse.json({ businessName: 'X', channels: { email: false, sms: true, whatsapp: true, calls: true } })),
    )
    const { user } = renderModal()
    await screen.findByText('Recipients: 5 customers')
    await user.click(screen.getByRole('button', { name: 'Send Message' }))
    await screen.findByText(/Sent to/)
    expect(sent[0]?.channel).toBe('sms')
  })
})
