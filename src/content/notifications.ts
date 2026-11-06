import type { NotificationType } from '@/api/notifications.api'

/** Copy for the header notification centre (NOTIF-02 / NOTIF-06). `{count}` is filled in. */
export const notificationsContent = {
  bell: {
    /** The button's accessible name: the unread count is part of it. */
    label: 'Notifications, {count} unread',
    labelNone: 'Notifications, none unread',
    tooltip: 'Notifications',
  },
  /** Spoken (polite live region) when the unread count goes up. */
  announceNew: '{count} unread notifications',
  announceNewOne: '1 unread notification',
  panel: {
    title: 'Notifications',
    listLabel: 'Recent notifications',
    loading: 'Loading notifications…',
    empty: 'You’re all caught up.',
    loadError: 'Could not load notifications.',
    retry: 'Try again',
    markAllRead: 'Mark all read',
    markAllFailed: 'Could not mark notifications as read.',
    loadMore: 'Show older notifications',
    loadingMore: 'Loading…',
    unread: 'Unread',
    read: 'Read',
    close: 'Close notifications',
  },
  /** Plain-language category shown above each title. */
  types: {
    SCHEDULE: 'Schedule',
    ROUND_UPDATE: 'Round update',
    CHAT: 'Message',
    PAYMENT: 'Payment',
    COMPLAINT: 'Complaint',
    ACCESS_ISSUE: 'Access issue',
    DAY_CLOSED: 'Day closed',
    INVITE: 'Invite',
    KPI_ALERT: 'KPI alert',
    INTEGRATION: 'Integration',
  } satisfies Record<NotificationType, string>,
  time: {
    yesterday: 'Yesterday {time}',
  },
} as const
