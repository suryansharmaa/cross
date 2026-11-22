import { request } from './client'
import type { Subscription, SubscriptionBody, SubscriptionPage, SubscriptionStatus } from './types'

const path = '/api/v1/subscriptions'
const item = (id: string) => path + '/' + encodeURIComponent(id)
const authenticated = true

export function listSubscriptions(page: number, status: SubscriptionStatus | undefined, signal: AbortSignal) {
  const params = new URLSearchParams({ page: String(page), size: '20' })
  if (status) params.set('status', status)
  return request<SubscriptionPage>(path + '?' + params, { authenticated, signal })
}
export const getSubscription = (id: string, signal: AbortSignal) =>
  request<Subscription>(item(id), { authenticated, signal })
export const createSubscription = (body: SubscriptionBody) =>
  request<Subscription>(path, { authenticated, body })
export const updateSubscription = (id: string, body: SubscriptionBody) =>
  request<Subscription>(item(id), { authenticated, method: 'PUT', body })
export const cancelSubscription = (id: string) =>
  request<Subscription>(item(id) + '/cancel', { authenticated, method: 'POST' })
export const deleteSubscription = (id: string) =>
  request<void>(item(id), { authenticated, method: 'DELETE' })
