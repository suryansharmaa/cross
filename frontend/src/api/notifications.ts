import { request } from './client'
import type { NotificationItem, NotificationPage, ReadAllResponse, UnreadCountResponse } from './types'

const path = '/api/v1/notifications'
const authenticated = true

export function listNotifications(page: number, unreadOnly: boolean, signal: AbortSignal) {
  const params = new URLSearchParams({ page: String(page), size: '20' })
  if (unreadOnly) params.set('unreadOnly', 'true')
  return request<NotificationPage>(path + '?' + params, { authenticated, signal })
}
export const getUnreadCount = (signal: AbortSignal) =>
  request<UnreadCountResponse>(path + '/unread-count', { authenticated, signal })
export const markRead = (id: string) =>
  request<NotificationItem>(path + '/' + encodeURIComponent(id) + '/read', { authenticated, method: 'POST' })
export const markAllRead = () =>
  request<ReadAllResponse>(path + '/read-all', { authenticated, method: 'POST' })
