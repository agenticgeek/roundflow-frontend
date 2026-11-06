import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, screen, waitFor } from '@testing-library/react'
import { focusManager } from '@tanstack/react-query'
import { HttpResponse, http } from 'msw'
import { notificationsApi } from '@/api/notifications.api'
import { NOTIFICATION_POLL_MS, useUnreadNotificationCount } from '@/features/notifications/hooks/useNotifications'
import { formatNotificationTime } from '@/features/notifications/lib/format-time'
import { notificationHref } from '@/features/notifications/lib/notification-link'
import { setTenantTimeZone } from '@/lib/timezone'
import { server } from '@/test/msw/server'
import { API } from '@/test/msw/typed'
import { renderWithProviders } from '@/test/render'

afterEach(() => {
  vi.useRealTimers()
  focusManager.setFocused(undefined)
  setTenantTimeZone(null)
})

function Probe() {
  const query = useUnreadNotificationCount()
  return <p data-testid="count">{query.data ? query.data.unreadCount : '-'}</p>
}

describe('unread count polling (NOTIF-05)', () => {
  it('polls every 30 s, pauses while the tab is hidden, and catches up on focus', async () => {
    let calls = 0
    server.use(
      http.get(`${API}/notifications/unread-count`, () => {
        calls += 1
        return HttpResponse.json({ unreadCount: calls })
      }),
    )
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
    renderWithProviders(<Probe />)
    await waitFor(() => expect(calls).toBe(1))

    await act(async () => {
      await vi.advanceTimersByTimeAsync(NOTIFICATION_POLL_MS)
    })
    await waitFor(() => expect(calls).toBe(2))
    expect(NOTIFICATION_POLL_MS).toBe(30_000)

    // Tab hidden: the interval ticks, but nothing is requested.
    act(() => focusManager.setFocused(false))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(NOTIFICATION_POLL_MS * 3)
    })
    expect(calls).toBe(2)

    // Back on the tab: refetch at once, even though the data is not stale.
    act(() => focusManager.setFocused(true))
    await waitFor(() => expect(calls).toBe(3))
    expect(screen.getByTestId('count')).toHaveTextContent('3')
  })
})

describe('notificationsApi', () => {
  it('sends the cursor and posts the read calls', async () => {
    const seen: string[] = []
    server.use(
      http.get(`${API}/notifications`, ({ request }) => {
        seen.push(`list ${new URL(request.url).searchParams.get('cursor') ?? 'none'}`)
        return HttpResponse.json({ notifications: [], unreadCount: 0, nextCursor: null })
      }),
      http.post(`${API}/notifications/:id/read`, ({ params }) => {
        seen.push(`read ${String(params.id)}`)
        return HttpResponse.json({ ok: true })
      }),
      http.post(`${API}/notifications/read-all`, () => {
        seen.push('read-all')
        return HttpResponse.json({ ok: true })
      }),
    )
    await notificationsApi.list()
    await notificationsApi.list('c 2')
    await notificationsApi.markRead('a/b')
    await notificationsApi.markAllRead()
    expect(seen).toEqual(['list none', 'list c 2', 'read a/b', 'read-all'])
  })
})

describe('notificationHref', () => {
  it('chooses the page from data first, in a fixed order', () => {
    expect(notificationHref('PAYMENT', { invoiceId: 'i1', propertyId: 'p1' })).toBe('/invoices')
    expect(notificationHref('COMPLAINT', { propertyId: 'p1', visitId: 'v1' })).toBe('/properties/p1')
    expect(notificationHref('COMPLAINT', { visitId: 'v1', roundId: 'r1' })).toBe('/todays-work?visitId=v1&round=r1')
    expect(notificationHref('COMPLAINT', { roundId: 'r1', date: '2026-11-06' })).toBe('/round-planner?round=r1&date=2026-11-06')
    expect(notificationHref('COMPLAINT', { customerId: 'c1' })).toBe('/customers')
  })

  it('deep-links schedule, round, access-issue and day-closed notifications to the item (Wave 2A)', () => {
    expect(notificationHref('SCHEDULE', { visitId: 'v1', roundId: 'r1', date: '2026-11-09' })).toBe(
      '/round-planner?visitId=v1&round=r1&date=2026-11-09',
    )
    expect(notificationHref('ROUND_UPDATE', { roundId: 'r1', customerId: 'c1' })).toBe('/round-planner?round=r1')
    expect(notificationHref('ACCESS_ISSUE', { propertyId: 'p1', visitId: 'v1', roundId: 'r1' })).toBe('/todays-work?visitId=v1&round=r1')
    expect(notificationHref('ACCESS_ISSUE', { propertyId: 'p1' })).toBe('/properties/p1')
    expect(notificationHref('ACCESS_ISSUE', { propertyId: 'p1', visitId: 'v1' })).toBe('/properties/p1')
    expect(notificationHref('DAY_CLOSED', { date: '2026-11-06' })).toBe('/todays-work?date=2026-11-06')
  })

  it('falls back to the type’s page, or none', () => {
    expect(notificationHref('COMPLAINT', null)).toBe('/complaints')
    expect(notificationHref('KPI_ALERT', {})).toBe('/dashboard')
    expect(notificationHref('INVITE', null)).toBe('/technicians')
    expect(notificationHref('DAY_CLOSED', null)).toBe('/todays-work')
    expect(notificationHref('PAYMENT', null)).toBe('/invoices')
    expect(notificationHref('INTEGRATION', null)).toBe('/settings/failed-messages')
    expect(notificationHref('CHAT', null)).toBeNull()
    expect(notificationHref('SCHEDULE', { date: '2026-11-06' })).toBeNull()
  })
})

describe('formatNotificationTime (tenant time zone)', () => {
  const now = new Date('2026-11-06T12:00:00Z')

  it('shows the time today, "Yesterday" for yesterday, and the date otherwise', () => {
    expect(formatNotificationTime('2026-11-06T09:05:00Z', now)).toBe('09:05')
    expect(formatNotificationTime('2026-11-05T16:45:00Z', now)).toBe('Yesterday 16:45')
    expect(formatNotificationTime('2026-10-30T08:00:00Z', now)).toBe('30 Oct, 08:00')
  })

  it('uses the business time zone, not the browser’s', () => {
    // 23:30 UTC on 5 Nov is already 6 Nov in Sydney (UTC+11) — "today", at 10:30.
    setTenantTimeZone('Australia/Sydney')
    expect(formatNotificationTime('2026-11-05T23:30:00Z', now)).toBe('10:30')
    setTenantTimeZone('Europe/London')
    expect(formatNotificationTime('2026-11-05T23:30:00Z', now)).toBe('Yesterday 23:30')
  })

  it('defaults `now` to the current time', () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(now)
    expect(formatNotificationTime('2026-11-06T09:05:00Z')).toBe('09:05')
  })
})
