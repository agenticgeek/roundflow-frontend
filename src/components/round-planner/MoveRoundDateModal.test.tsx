import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import { MoveRoundDateModal } from '@/components/round-planner/MoveRoundDateModal'
import type { MoveOccurrenceInput, MoveOccurrencePreview, MoveOccurrenceResult } from '@/features/rounds/lib/move-occurrence'
import { formatLongDate } from '@/features/rounds/lib/planner'
import { queryKeys } from '@/lib/query-keys'
import { server } from '@/test/msw/server'
import { apiError, mswPath } from '@/test/msw/typed'
import { renderWithProviders } from '@/test/render'

// Today is fixed to Wed 25 Nov 2026 (only Date is faked, so user-event timers keep working).
const TODAY = '2026-11-25'

const basePreview = (over: Partial<MoveOccurrencePreview> = {}): MoveOccurrencePreview => ({
  fromDate: '2026-11-27',
  kind: 'REAL',
  propertyCount: 12,
  earliestDate: '2026-11-21',
  latestDate: '2026-12-10',
  blockedDates: [
    { date: '2026-11-29', reason: 'CLOSED_DAY', label: 'Sunday' },
    { date: '2026-12-01', reason: 'CLOSURE', label: 'Staff holiday' },
  ],
  check: null,
  ...over,
})

const okCheck = (toDate: string) => ({ toDate, ok: true, code: null, message: null, clashCount: 0 })

type Check = MoveOccurrencePreview['check']

/** Preview handler: the base preview, plus `check(toDate)` when a toDate is sent. Records every request URL. */
function mockPreview(
  options: { preview?: Partial<MoveOccurrencePreview>; check?: (toDate: string) => Check } = {},
  seen: URL[] = [],
) {
  server.use(
    http.get(mswPath('/rounds/{id}/move-occurrence/preview'), ({ request }) => {
      const url = new URL(request.url)
      seen.push(url)
      const toDate = url.searchParams.get('toDate')
      return HttpResponse.json(
        basePreview({ ...options.preview, check: toDate ? (options.check ?? okCheck)(toDate) : null }),
      )
    }),
  )
  return seen
}

const result = (over: Partial<MoveOccurrenceResult> = {}): MoveOccurrenceResult => ({
  fromDate: '2026-11-27', toDate: TODAY, kind: 'REAL', movedVisits: 12, createdVisits: 0, notifiedCustomers: 11,
  customerNotificationError: null, ...over,
})

function mockMove(respond: () => Response, bodies: MoveOccurrenceInput[] = []) {
  server.use(
    http.post(mswPath('/rounds/{id}/move-occurrence'), async ({ request }) => {
      bodies.push((await request.json()) as MoveOccurrenceInput)
      return respond()
    }),
  )
  return bodies
}

const target = { roundId: 'r1', roundName: 'Alnwick Fri', date: '2026-11-27', projected: false }

function renderModal(over: Partial<typeof target> = {}, onClose = vi.fn()) {
  return { onClose, ...renderWithProviders(<MoveRoundDateModal target={{ ...target, ...over }} onClose={onClose} />) }
}

const day = (date: string) => screen.getByRole('button', { name: new RegExp(`^${formatLongDate(date)}`) })
const confirmButton = () => screen.getByRole('button', { name: 'Move date' })

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(`${TODAY}T12:00:00Z`))
})
afterEach(() => vi.useRealTimers())

describe('MoveRoundDateModal', () => {
  it('previews the date: property count, defaults to today and checks it', async () => {
    const seen = mockPreview()
    renderModal()
    expect(await screen.findByText('12 properties will move')).toBeInTheDocument()
    expect(seen[0].pathname).toContain('/rounds/r1/move-occurrence/preview')
    expect(seen[0].searchParams.get('fromDate')).toBe('2026-11-27')
    expect(seen[0].searchParams.get('toDate')).toBeNull()
    expect(day(TODAY)).toHaveAttribute('aria-pressed', 'true')
    await waitFor(() => expect(seen.some((url) => url.searchParams.get('toDate') === TODAY)).toBe(true))
    await waitFor(() => expect(confirmButton()).toBeEnabled())
    expect(screen.queryByText(/forecast date/i)).not.toBeInTheDocument()
  })

  it('says when it is a forecast date and defaults to the earliest date when today is outside the window', async () => {
    mockPreview({ preview: { kind: 'FORECAST', propertyCount: 1, fromDate: '2026-12-08', earliestDate: '2026-12-02' } })
    renderModal({ date: '2026-12-08', projected: true })
    expect(await screen.findByText('1 property will move')).toBeInTheDocument()
    expect(screen.getByText(/forecast date/i)).toBeInTheDocument()
    expect(day('2026-12-02')).toHaveAttribute('aria-pressed', 'true')
  })

  it('disables past, out-of-window, closed and closure dates with the reason', async () => {
    mockPreview()
    const { user } = renderModal()
    await screen.findByText('12 properties will move')
    expect(day('2026-11-24')).toBeDisabled()
    expect(day('2026-11-24')).toHaveAccessibleName(/in the past/i)
    expect(day('2026-11-27')).toBeDisabled()
    expect(day('2026-11-27')).toHaveAccessibleName(/current date/i)
    expect(day('2026-11-29')).toBeDisabled()
    expect(day('2026-11-29')).toHaveAccessibleName(/day closed/i)
    await user.click(screen.getByRole('button', { name: 'Next month' }))
    expect(day('2026-12-01')).toBeDisabled()
    expect(day('2026-12-01')).toHaveAccessibleName(/Staff holiday/)
    expect(day('2026-12-11')).toBeDisabled()
    expect(day('2026-12-11')).toHaveAccessibleName(/must stay between the previous and next round dates/)
    expect(screen.getByRole('button', { name: 'Next month' })).toBeDisabled()
    // The closure and closed day are also listed, so the reason is readable without hovering.
    const list = screen.getByRole('list', { name: 'Unavailable dates' })
    expect(within(list).getByText(/Staff holiday/)).toBeInTheDocument()
    expect(within(list).getByText(/Day closed/)).toBeInTheDocument()
    expect(screen.getByText(/must stay between the previous and next round dates/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Previous month' }))
    expect(day('2026-11-28')).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Previous month' })).toBeDisabled()
  })

  it('re-checks a picked date and blocks confirm with the server’s warning', async () => {
    const seen = mockPreview({
      check: (toDate) =>
        toDate === '2026-11-28'
          ? { toDate, ok: false, code: 'PROPERTY_CLEAN_CLASH', message: '2 properties would get two cleans too close', clashCount: 2 }
          : okCheck(toDate),
    })
    const { user } = renderModal()
    await screen.findByText('12 properties will move')
    await user.click(day('2026-11-28'))
    expect(day('2026-11-28')).toHaveAttribute('aria-pressed', 'true')
    expect(await screen.findByText('2 properties would get two cleans too close')).toBeInTheDocument()
    expect(seen.some((url) => url.searchParams.get('toDate') === '2026-11-28')).toBe(true)
    expect(confirmButton()).toBeDisabled()
    await user.click(day('2026-11-26'))
    await waitFor(() => expect(confirmButton()).toBeEnabled())
    expect(screen.queryByText('2 properties would get two cleans too close')).not.toBeInTheDocument()
  })

  it('falls back to a generic warning when a failed check has no message', async () => {
    mockPreview({ check: (toDate) => ({ toDate, ok: false, code: 'DAY_CLOSED', message: null, clashCount: 0 }) })
    renderModal()
    expect(await screen.findByText("This date can't be used for the move.")).toBeInTheDocument()
    expect(confirmButton()).toBeDisabled()
  })

  it('notifies customers by default and sends the optional message', async () => {
    mockPreview()
    const bodies = mockMove(() => HttpResponse.json(result()))
    const { user } = renderModal()
    await screen.findByText('12 properties will move')
    expect(screen.getByRole('switch', { name: 'Notify customers' })).toHaveAttribute('aria-checked', 'true')
    await user.type(screen.getByLabelText('Message (optional)'), '  Sorry for the change  ')
    await waitFor(() => expect(confirmButton()).toBeEnabled())
    await user.click(confirmButton())
    await waitFor(() => expect(bodies).toHaveLength(1))
    expect(bodies[0]).toEqual({ fromDate: '2026-11-27', toDate: TODAY, notifyCustomers: true, message: 'Sorry for the change' })
  })

  it('switching notify off hides the message and sends no message', async () => {
    mockPreview()
    const bodies = mockMove(() => HttpResponse.json(result({ notifiedCustomers: 0 })))
    const { user } = renderModal()
    await screen.findByText('12 properties will move')
    await user.type(screen.getByLabelText('Message (optional)'), 'Hello')
    await user.click(screen.getByRole('switch', { name: 'Notify customers' }))
    expect(screen.queryByLabelText('Message (optional)')).not.toBeInTheDocument()
    await waitFor(() => expect(confirmButton()).toBeEnabled())
    await user.click(confirmButton())
    await waitFor(() => expect(bodies).toHaveLength(1))
    expect(bodies[0]).toEqual({ fromDate: '2026-11-27', toDate: TODAY, notifyCustomers: false })
  })

  it('on success: toasts, refreshes planner and rounds data, and closes', async () => {
    mockPreview()
    mockMove(() => HttpResponse.json(result({ movedVisits: 0, createdVisits: 9, kind: 'FORECAST' })))
    const { user, onClose, queryClient } = renderModal()
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
    await screen.findByText('12 properties will move')
    await waitFor(() => expect(confirmButton()).toBeEnabled())
    await user.click(confirmButton())
    expect(await screen.findByText(`Moved 9 visits to ${formatLongDate(TODAY)}`)).toBeInTheDocument()
    expect(onClose).toHaveBeenCalled()
    const keys = invalidate.mock.calls.map(([filters]) => filters?.queryKey)
    expect(keys).toContainEqual(queryKeys.rounds.all)
    expect(keys).toContainEqual(queryKeys.today.all)
  })

  it('mentions a failed customer notification in the toast', async () => {
    mockPreview()
    mockMove(() => HttpResponse.json(result({ movedVisits: 1, notifiedCustomers: 0, customerNotificationError: 'SMS provider down' })))
    const { user } = renderModal()
    await screen.findByText('12 properties will move')
    await waitFor(() => expect(confirmButton()).toBeEnabled())
    await user.click(confirmButton())
    expect(await screen.findByText(`Moved 1 visit to ${formatLongDate(TODAY)}`)).toBeInTheDocument()
    expect(screen.getByText("Customers weren't notified: SMS provider down")).toBeInTheDocument()
  })

  it('shows a 409 from the move as the warning and stays open', async () => {
    mockPreview()
    mockMove(() => apiError(409, 'Staff holiday covers that date now', 'DATE_IN_CLOSURE'))
    const { user, onClose } = renderModal()
    await screen.findByText('12 properties will move')
    await waitFor(() => expect(confirmButton()).toBeEnabled())
    await user.click(confirmButton())
    expect(await screen.findByText('Staff holiday covers that date now')).toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()
    expect(confirmButton()).toBeDisabled()
    // Picking another date clears the stale warning.
    await user.click(day('2026-11-26'))
    expect(screen.queryByText('Staff holiday covers that date now')).not.toBeInTheDocument()
  })

  it('toasts any other move failure', async () => {
    mockPreview()
    mockMove(() => apiError(500, 'Database unavailable'))
    const { user, onClose } = renderModal()
    await screen.findByText('12 properties will move')
    await waitFor(() => expect(confirmButton()).toBeEnabled())
    await user.click(confirmButton())
    expect(await screen.findByText(/Database unavailable/)).toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('shows a preview error (e.g. the date is not movable) and cannot confirm', async () => {
    server.use(
      http.get(mswPath('/rounds/{id}/move-occurrence/preview'), () =>
        apiError(409, 'Only the next forecast date can be moved', 'OCCURRENCE_NOT_MOVABLE'),
      ),
    )
    renderModal()
    expect(await screen.findByText('Only the next forecast date can be moved')).toBeInTheDocument()
    expect(confirmButton()).toBeDisabled()
  })

  it('says so when no date in the window can be used', async () => {
    mockPreview({ preview: { earliestDate: '2026-11-27', latestDate: '2026-11-27' } })
    renderModal()
    expect(await screen.findByText(/no date this round can move to/i)).toBeInTheDocument()
    expect(confirmButton()).toBeDisabled()
  })

  it('renders nothing without a target', () => {
    renderWithProviders(<MoveRoundDateModal target={null} onClose={vi.fn()} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
