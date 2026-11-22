import { queryOptions } from '@tanstack/react-query'
import { getUnreadCount, listNotifications } from '../../api/notifications'

export const notificationsKey = (userId: string) => ['notifications', userId] as const
export const unreadCountQuery = (userId: string) => queryOptions({
  queryKey: [...notificationsKey(userId), 'unread-count'],
  queryFn: ({ signal }) => getUnreadCount(signal),
  retry: false,
})
export const notificationsQuery = (userId: string, unread: boolean, page: number) => queryOptions({
  queryKey: [...notificationsKey(userId), 'list', unread ? 'unread' : 'all', page, 20],
  queryFn: ({ signal }) => listNotifications(page, unread, signal),
  retry: false,
})
