import { queryOptions, type QueryClient } from '@tanstack/react-query'
import { getSubscription, listSubscriptions } from '../../api/subscriptions'
import type { SubscriptionStatus } from '../../api/types'
import { dashboardKey } from '../dashboard/queries'
import { notificationsKey } from '../notifications/queries'

export const subscriptionsKey = (account: string) => ['subscriptions', account] as const
export const listQuery = (account: string, page: number, status?: SubscriptionStatus) => queryOptions({
  queryKey: [...subscriptionsKey(account), 'list', status ?? 'all', page, 20],
  queryFn: ({ signal }) => listSubscriptions(page, status, signal),
  retry: false,
})
export const detailQuery = (account: string, id: string) => queryOptions({
  queryKey: [...subscriptionsKey(account), 'detail', id],
  queryFn: ({ signal }) => getSubscription(id, signal),
  retry: false,
})

export function refreshSubscriptionViews(cache: QueryClient, account: string, deleted = false) {
  void cache.invalidateQueries({ queryKey: subscriptionsKey(account) })
  void cache.invalidateQueries({ queryKey: dashboardKey(account) })
  if (deleted) void cache.invalidateQueries({ queryKey: notificationsKey(account) })
}
