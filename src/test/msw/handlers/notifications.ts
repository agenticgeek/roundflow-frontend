import { on, specJson } from '@/test/msw/typed'

/** Quiet defaults for the admin notification feed so any screen with the header bell renders. */
export const notificationsHandlers = [
  on('get', '/notifications/unread-count', () => specJson('/notifications/unread-count', 'get', 200, { unreadCount: 0 })),
  on('get', '/notifications', () => specJson('/notifications', 'get', 200, { notifications: [], unreadCount: 0, nextCursor: null })),
]
