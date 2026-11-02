import { describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { HttpResponse } from 'msw'
import type { MessageBulkResult } from '@/api/messages.api'
import type { WeatherHoldPreview, WeatherHoldResult } from '@/api/rounds.api'
import { WeatherHoldModal } from '@/components/round-planner/WeatherHoldModal'
import { server } from '@/test/msw/server'
import { apiError, on } from '@/test/msw/typed'
import { renderWithProviders } from '@/test/render'

const round = { id: 'r1', name: 'Alnwick Fri', stopCount: 9, holdCount: 1 }

const preview = (over: Partial<WeatherHoldPreview> = {}): WeatherHoldPreview => ({
  date: '2026-11-05',
  affectedVisits: 7,
  affectedCustomers: 6,
  optedOutCustomers: 1,
  newDate: '2026-11-06',
  message: "Hi Jane, due to heavy rain we've had to postpone your clean.",
  characterCount: 58,
  templateName: null,
  ...over,
})

const notification = (over: Partial<MessageBulkResult> = {}): MessageBulkResult => ({
  queued: 5, sent: 5, scheduled: 0, skippedOptedOut: 1, skippedNoContact: 0, failed: 0, scheduledFor: null, recipients: [], ...over,
})

function mockPreview(data: WeatherHoldPreview | ((url: URL) => WeatherHoldPreview), seen: URL[] = []) {
  server.use(
    on('get', '/rounds/{id}/weather-hold/preview' as never, ({ request }: { request: Request }) => {
      const url = new URL(request.url)
      seen.push(url)
      return HttpResponse.json(typeof data === 'function' ? data(url) : data)
    }),
  )
}

function renderModal(onClose = vi.fn()) {
  return renderWithProviders(<WeatherHoldModal open round={round} date="2026-11-05" dateLabel="Thu" onClose={onClose} />)
}

describe('WeatherHoldModal', () => {
  it('shows the real affected-visit count, the rendered message and its character count', async () => {
    const seen: URL[] = []
    mockPreview(preview(), seen)
    renderModal()
    expect(await screen.findByText(/7\s+visits will be affected/)).toBeInTheDocument()
    expect(screen.getByText("Hi Jane, due to heavy rain we've had to postpone your clean.")).toBeInTheDocument()
    expect(screen.getByText('58 characters')).toBeInTheDocument()
    expect(screen.getByText(/1 opted out of messages/)).toBeInTheDocument()
    expect(screen.getByText(/New date: /)).toBeInTheDocument()
    expect(seen[0].searchParams.get('date')).toBe('2026-11-05')
    expect(seen[0].searchParams.get('condition')).toBe('heavy-rain')
    expect(seen[0].searchParams.get('rescheduling')).toBe('next-available')
  })

  it('re-previews with the chosen condition and rescheduling, and explains manual rescheduling', async () => {
    const seen: URL[] = []
    mockPreview((url) => preview(url.searchParams.get('rescheduling') === 'manual' ? { newDate: null } : {}), seen)
    const { user } = renderModal()
    await screen.findByText(/7\s+visits will be affected/)
    await user.click(screen.getByLabelText('Weather Condition'))
    await user.click(screen.getByRole('option', { name: 'Snow / ice' }))
    await user.click(screen.getByRole('button', { name: /Manual rescheduling/ }))
    expect(await screen.findByText('No new date — the visits are marked as skipped')).toBeInTheDocument()
    const last = seen[seen.length - 1]
    expect(last.searchParams.get('condition')).toBe('snow-ice')
    expect(last.searchParams.get('rescheduling')).toBe('manual')
  })

  it('applies the hold with the chosen options and shows the notification outcome', async () => {
    mockPreview(preview())
    let body: unknown
    const result: WeatherHoldResult = {
      roundId: 'r1', date: '2026-11-05', condition: 'high-winds', rescheduling: 'next-cycle', held: 7, newDate: '2026-12-03',
      notification: notification({
        skippedOptedOut: 1,
        failed: 1,
        recipients: [
          { customerId: 'c1', customerName: 'Opted Out Ltd', status: 'skipped_opted_out' },
          { customerId: 'c2', customerName: 'Failed Fred', status: 'failed', error: 'boom' },
        ],
      }),
    }
    server.use(
      on('post', '/rounds/{id}/weather-hold' as never, async ({ request }: { request: Request }) => {
        body = await request.json()
        return HttpResponse.json(result)
      }),
    )
    const onClose = vi.fn()
    const { user } = renderModal(onClose)
    await screen.findByText(/7\s+visits will be affected/)
    await user.click(screen.getByLabelText('Weather Condition'))
    await user.click(screen.getByRole('option', { name: 'High winds' }))
    await user.click(screen.getByRole('button', { name: /Add to next round cycle/ }))
    await user.click(screen.getByRole('button', { name: 'Hold & notify customers' }))

    expect(await screen.findByText(/7 visits held/)).toBeInTheDocument()
    expect(body).toEqual({ date: '2026-11-05', condition: 'high-winds', rescheduling: 'next-cycle', notifyCustomers: true })
    expect(screen.getByText(/Sent to 5 customers · 1 opted out · 1 failed/)).toBeInTheDocument()
    expect(screen.getByText('Opted Out Ltd')).toBeInTheDocument()
    expect(screen.getByText('Failed Fred')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Done' }))
    expect(onClose).toHaveBeenCalled()
  })

  it('applies without notifying: no message preview, and the result says customers were not notified', async () => {
    mockPreview(preview())
    let body: Record<string, unknown> = {}
    server.use(
      on('post', '/rounds/{id}/weather-hold' as never, async ({ request }: { request: Request }) => {
        body = (await request.json()) as Record<string, unknown>
        return HttpResponse.json({ roundId: 'r1', date: '2026-11-05', condition: 'heavy-rain', rescheduling: 'manual', held: 1, newDate: null, notification: null })
      }),
    )
    const { user } = renderModal()
    await screen.findByText(/7\s+visits will be affected/)
    await user.click(screen.getByRole('button', { name: /Notify customers/ }))
    expect(screen.queryByText('58 characters')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Apply hold' }))
    expect(await screen.findByText(/1 visit held/)).toBeInTheDocument()
    expect(screen.getByText(/marked as skipped/)).toBeInTheDocument()
    expect(screen.getByText('Customers were not notified.')).toBeInTheDocument()
    expect(body.notifyCustomers).toBe(false)
  })

  it('reports a notification failure that did not undo the hold', async () => {
    mockPreview(preview())
    server.use(
      on('post', '/rounds/{id}/weather-hold' as never, () =>
        HttpResponse.json({ roundId: 'r1', date: '2026-11-05', condition: 'heavy-rain', rescheduling: 'next-available', held: 2, newDate: '2026-11-06', notification: null, notificationError: 'ghl down' }),
      ),
    )
    const { user } = renderModal()
    await screen.findByText(/7\s+visits will be affected/)
    await user.click(screen.getByRole('button', { name: 'Hold & notify customers' }))
    expect(await screen.findByText(/could not be notified: ghl down/)).toBeInTheDocument()
  })

  it('keeps the modal open and shows the server error when applying fails', async () => {
    mockPreview(preview())
    server.use(on('post', '/rounds/{id}/weather-hold' as never, () => apiError(409, 'GoHighLevel is not connected', 'GHL_NOT_CONNECTED')))
    const onClose = vi.fn()
    const { user } = renderModal(onClose)
    await screen.findByText(/7\s+visits will be affected/)
    await user.click(screen.getByRole('button', { name: 'Hold & notify customers' }))
    expect(await screen.findByText('GoHighLevel is not connected')).toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Hold & notify customers' })).toBeEnabled()
  })

  it('disables applying, and says why, when nothing is scheduled', async () => {
    mockPreview(preview({ affectedVisits: 0, affectedCustomers: 0, optedOutCustomers: 0, message: '', characterCount: 0, newDate: null }))
    renderModal()
    expect(await screen.findByText(/0\s+visits will be affected/)).toBeInTheDocument()
    expect(screen.getByText('No scheduled visits on this date, so there is nothing to hold.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Hold & notify customers' })).toBeDisabled()
  })

  it('uses the singular for one visit and shows an error when the preview cannot load', async () => {
    mockPreview(preview({ affectedVisits: 1 }))
    const first = renderModal()
    expect(await screen.findByText(/1\s+visit will be affected/)).toBeInTheDocument()
    first.unmount()

    server.use(on('get', '/rounds/{id}/weather-hold/preview' as never, () => apiError(500, 'boom')))
    renderModal()
    await waitFor(() => expect(screen.getByText('Could not load the preview.')).toBeInTheDocument())
    expect(screen.getByRole('button', { name: 'Hold & notify customers' })).toBeDisabled()
  })
})
