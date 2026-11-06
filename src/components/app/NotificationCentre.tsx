import { useEffect, useId, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import type { AppNotification } from '@/api/notifications.api'
import { DashboardIcon } from '@/components/dashboard/DashboardIcon'
import { notificationsContent } from '@/content/notifications'
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotificationFeed,
  useUnreadNotificationCount,
} from '@/features/notifications/hooks/useNotifications'
import { formatNotificationTime } from '@/features/notifications/lib/format-time'
import { notificationHref } from '@/features/notifications/lib/notification-link'
import { useAppBootstrap } from '@/providers/AppBootstrapProvider'
import { cn, fillCopy } from '@/lib/utils'

const PANEL_WIDTH = 384
const EDGE = 12

const rowClass =
  'flex w-full items-start gap-2.5 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary'

function NotificationRow({ notification, onActivate }: { notification: AppNotification; onActivate: (notification: AppNotification) => void }) {
  const copy = notificationsContent
  const href = notificationHref(notification.type, notification.data)
  const content = (
    <>
      <span aria-hidden="true" className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', notification.read ? 'bg-transparent' : 'bg-primary')} />
      <span className="min-w-0 flex-1">
        <span className="sr-only">{notification.read ? copy.panel.read : copy.panel.unread}. </span>
        <span className="block text-xs font-medium text-muted">{copy.types[notification.type]}</span>
        <span className={cn('block text-sm text-foreground', notification.read ? 'font-medium' : 'font-semibold')}>{notification.title}</span>
        {notification.body ? <span className="mt-0.5 block text-sm text-muted">{notification.body}</span> : null}
        <time dateTime={notification.createdAt} className="mt-1 block text-xs text-muted">
          {formatNotificationTime(notification.createdAt)}
        </time>
      </span>
    </>
  )
  return (
    <li>
      {href ? (
        <Link to={href} onClick={() => onActivate(notification)} className={rowClass}>
          {content}
        </Link>
      ) : (
        <button type="button" onClick={() => onActivate(notification)} className={rowClass}>
          {content}
        </button>
      )}
    </li>
  )
}

/** The open popover: header with "Mark all read", the labelled list, paging, and its states. */
function NotificationPanel({
  panelId,
  anchor,
  unreadCount,
  onClose,
}: {
  panelId: string
  anchor: HTMLButtonElement
  unreadCount: number
  onClose: (restoreFocus: boolean) => void
}) {
  const copy = notificationsContent.panel
  const feed = useNotificationFeed(true)
  const markRead = useMarkNotificationRead()
  const markAll = useMarkAllNotificationsRead()
  const panelRef = useRef<HTMLDivElement>(null)
  const notifications = feed.data?.pages.flatMap((page) => page.notifications) ?? []

  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  // Focus moves into the popover once, on open; a click anywhere else closes it.
  useEffect(() => {
    panelRef.current?.focus()
  }, [])
  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node
      if (!panelRef.current?.contains(target) && !anchor.contains(target)) onCloseRef.current(false)
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [anchor])

  const rect = anchor.getBoundingClientRect()
  const width = Math.min(PANEL_WIDTH, window.innerWidth - EDGE * 2)
  const style: CSSProperties = {
    top: rect.bottom + 8,
    left: Math.max(EDGE, Math.min(rect.left, window.innerWidth - width - EDGE)),
    width,
  }

  function activate(notification: AppNotification) {
    if (!notification.read) markRead.mutate(notification.id)
    onClose(false)
  }

  return createPortal(
    <div
      ref={panelRef}
      id={panelId}
      role="dialog"
      aria-label={copy.title}
      tabIndex={-1}
      style={style}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.stopPropagation()
          onClose(true)
        }
      }}
      onBlur={(event) => {
        // Tabbing out of the popover closes it (it is portalled, so there is no sensible next stop).
        const next = event.relatedTarget as Node | null
        if (next && !panelRef.current?.contains(next) && !anchor.contains(next)) onClose(false)
      }}
      className="fixed z-[60] flex max-h-[min(32rem,calc(100dvh-5rem))] flex-col rounded-xl border border-border bg-card shadow-xl focus:outline-none"
    >
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground">{copy.title}</h2>
        <button
          type="button"
          disabled={unreadCount === 0 || markAll.isPending}
          onClick={() => markAll.mutate()}
          className="rounded-md px-2 py-1 text-sm font-semibold text-primary underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-60"
        >
          {copy.markAllRead}
        </button>
      </div>
      {markAll.isError ? (
        <p role="alert" className="px-4 pt-2 text-sm text-danger">
          {copy.markAllFailed}
        </p>
      ) : null}
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {feed.isPending ? (
          <p className="px-3 py-4 text-sm text-muted">{copy.loading}</p>
        ) : feed.isError ? (
          <div className="space-y-2 px-3 py-4">
            <p role="alert" className="text-sm text-danger">
              {copy.loadError}
            </p>
            <button type="button" onClick={() => void feed.refetch()} className="text-sm font-semibold text-primary underline">
              {copy.retry}
            </button>
          </div>
        ) : notifications.length === 0 ? (
          <p className="px-3 py-4 text-sm text-muted">{copy.empty}</p>
        ) : (
          <ul aria-label={copy.listLabel} className="space-y-0.5">
            {notifications.map((notification) => (
              <NotificationRow key={notification.id} notification={notification} onActivate={activate} />
            ))}
          </ul>
        )}
        {feed.hasNextPage ? (
          <button
            type="button"
            disabled={feed.isFetchingNextPage}
            onClick={() => void feed.fetchNextPage()}
            className="mt-1 w-full rounded-lg px-3 py-2 text-sm font-semibold text-primary hover:bg-surface focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-60"
          >
            {feed.isFetchingNextPage ? copy.loadingMore : copy.loadMore}
          </button>
        ) : null}
      </div>
    </div>,
    document.body,
  )
}

/**
 * Header notification centre (NOTIF-02 / NOTIF-06): a bell whose accessible name carries the
 * unread count, a polite live region that announces new arrivals, and a keyboard-operable popover
 * with the feed. Distinct from the emergencies bell, which stays the high-priority alert.
 * Office roles only (the endpoints are ADMIN / MANAGER).
 */
export function NotificationCentre({ className }: { className?: string }) {
  const { canMutate } = useAppBootstrap()
  const copy = notificationsContent
  const unreadQuery = useUnreadNotificationCount()
  const unread = unreadQuery.data?.unreadCount ?? 0
  const panelId = useId()
  const [anchor, setAnchor] = useState<HTMLButtonElement | null>(null)
  const [open, setOpen] = useState(false)
  const [announcement, setAnnouncement] = useState('')
  const previous = useRef<number | null>(null)

  // Announce only when the count goes up after the first load — never on page load.
  useEffect(() => {
    if (!unreadQuery.isSuccess) return
    if (previous.current !== null && unread > previous.current) {
      setAnnouncement(unread === 1 ? copy.announceNewOne : fillCopy(copy.announceNew, { count: unread }))
    }
    previous.current = unread
  }, [copy.announceNew, copy.announceNewOne, unread, unreadQuery.isSuccess])

  function close(restoreFocus: boolean) {
    setOpen(false)
    if (restoreFocus) anchor?.focus()
  }

  if (!canMutate) return null

  return (
    <>
      <button
        ref={setAnchor}
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={unread > 0 ? fillCopy(copy.bell.label, { count: unread }) : copy.bell.labelNone}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        title={copy.bell.tooltip}
        className={cn(
          'relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary',
          className,
        )}
      >
        <DashboardIcon name="bell" className="h-4 w-4" />
        {unread > 0 ? (
          <span
            aria-hidden="true"
            className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold leading-none text-primary-foreground"
          >
            {unread > 99 ? '99+' : unread}
          </span>
        ) : null}
      </button>
      <span role="status" aria-live="polite" className="sr-only">
        {announcement}
      </span>
      {open && anchor ? <NotificationPanel panelId={panelId} anchor={anchor} unreadCount={unread} onClose={close} /> : null}
    </>
  )
}
