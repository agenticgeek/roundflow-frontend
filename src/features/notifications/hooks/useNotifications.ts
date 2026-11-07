import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { notificationsApi, type NotificationsPage } from '@/api/notifications.api'
import { useAppBootstrap } from '@/providers/AppBootstrapProvider'

/** The unread badge polls on this cadence — and only while the tab is visible (NOTIF-05). */
export const NOTIFICATION_POLL_MS = 30_000

export const notificationKeys = {
  all: ['notifications'] as const,
  list: ['notifications', 'list'] as const,
  unread: ['notifications', 'unread'] as const,
}

/**
 * Unread count for the header bell. Polled every 30 s; TanStack Query pauses interval refetches
 * while the tab is hidden or unfocused (`refetchIntervalInBackground: false`) and
 * `refetchOnWindowFocus: 'always'` catches up the moment the user comes back. Office roles only.
 */
export function useUnreadNotificationCount() {
  const { canMutate } = useAppBootstrap()
  return useQuery({
    queryKey: notificationKeys.unread,
    queryFn: ({ signal }) => notificationsApi.unreadCount(signal),
    refetchInterval: NOTIFICATION_POLL_MS,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: 'always',
    enabled: canMutate,
  })
}

/** The feed, newest first, a page at a time (`nextCursor`). Only fetched while the panel is open. */
export function useNotificationFeed(enabled: boolean) {
  const { canMutate } = useAppBootstrap()
  return useInfiniteQuery({
    queryKey: notificationKeys.list,
    queryFn: ({ pageParam, signal }) => notificationsApi.list(pageParam, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (last: NotificationsPage) => last.nextCursor,
    enabled: enabled && canMutate,
  })
}

/** Marks one notification read, then refreshes the feed and the badge. */
export function useMarkNotificationRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSettled: () => queryClient.invalidateQueries({ queryKey: notificationKeys.all }),
  })
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: notificationKeys.all }),
  })
}
