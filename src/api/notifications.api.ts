import { api } from '@/api/client'
import type { components } from '@/api/types.gen'

type Schemas = components['schemas']

/** The generated enum predates `INTEGRATION` (Wave 2B-1: "Integration message failed", office only). */
export type NotificationType = Schemas['AdminNotification']['type'] | 'INTEGRATION'

/** Where a notification points; any subset may be present. */
export type NotificationData = NonNullable<Schemas['NotificationData']>

export type AppNotification = Omit<Schemas['AdminNotification'], 'type'> & { type: NotificationType }

export type NotificationsPage = Omit<Schemas['AdminNotificationPage'], 'notifications'> & {
  notifications: AppNotification[]
}

export const notificationsApi = {
  list: (cursor?: string | null, signal?: AbortSignal) =>
    api<NotificationsPage>(`/notifications${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`, { signal }),

  unreadCount: (signal?: AbortSignal) => api<{ unreadCount: number }>('/notifications/unread-count', { signal }),

  markRead: (id: string) => api<{ ok: true }>(`/notifications/${encodeURIComponent(id)}/read`, { method: 'POST' }),

  markAllRead: () => api<{ ok: true }>('/notifications/read-all', { method: 'POST' }),
}
