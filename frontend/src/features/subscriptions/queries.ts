import { queryOptions } from '@tanstack/react-query'
import { getSubscription, listSubscriptions } from '../../api/subscriptions'
import type { SubscriptionStatus } from '../../api/types'
import { useAuth } from '../auth/auth-context'
import { readSession } from '../auth/session'

export const subscriptionsKey = (account: string) => ['subscriptions', account] as const
export function useAccount() {
  const { user } = useAuth()
  if (!user) throw new Error('Subscriptions require an account')
  return user.id
}
export function sessionGuard() {
  const { session } = readSession()
  return () => session !== null && readSession().session?.accessToken === session.accessToken
}
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
