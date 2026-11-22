import { beforeEach, expect, it, vi } from 'vitest'
import { storeSession } from '../features/auth/session'
import { cancelSubscription, createSubscription, deleteSubscription, getSubscription, listSubscriptions, updateSubscription } from './subscriptions'
import type { SubscriptionBody } from './types'

const base = 'http://localhost:8080/api/v1/subscriptions'
const fetchMock = vi.fn<typeof fetch>()
const body: SubscriptionBody = { name: 'Plan', category: 'OTHER', amount: 12.5, billingCycle: 'MONTHLY',
  startDate: '2024-02-29', isTrial: false, trialEndDate: null, notes: null }
beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
  vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8080')
  storeSession({ accessToken: 'example', expiresAt: '2099-01-01T00:00:00Z' })
})

it('uses the authenticated transport for every subscription endpoint', async () => {
  const signal = new AbortController().signal
  fetchMock.mockImplementation(async (_, init) => init?.method === 'DELETE'
    ? new Response(null, { status: 204 }) : Response.json({ id: 'one' }))
  await listSubscriptions(1, 'ACTIVE', signal)
  await listSubscriptions(0, undefined, signal)
  await getSubscription('one', signal)
  await createSubscription(body)
  await updateSubscription('one', body)
  await cancelSubscription('one')
  expect(await deleteSubscription('one')).toBeUndefined()
  expect(fetchMock.mock.calls.map(([url, init]) => [url, init?.method, init?.body])).toEqual([
    [base + '?page=1&size=20&status=ACTIVE', 'GET', undefined],
    [base + '?page=0&size=20', 'GET', undefined],
    [base + '/one', 'GET', undefined],
    [base, 'POST', JSON.stringify(body)],
    [base + '/one', 'PUT', JSON.stringify(body)],
    [base + '/one/cancel', 'POST', undefined],
    [base + '/one', 'DELETE', undefined],
  ])
  for (const [, init] of fetchMock.mock.calls)
    expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer example')
  expect(fetchMock.mock.calls[0]?.[1]?.signal).toBe(signal)
  expect(fetchMock.mock.calls[2]?.[1]?.signal).toBe(signal)
})

it.each([[400, 'validation_failed'], [404, 'subscription_not_found'], [409, 'optimistic_lock_conflict']])(
  'preserves ProblemDetail %i %s', async (status, code) => {
    const fieldErrors = status === 400 ? [{ field: 'startDate', message: 'Invalid date' }] : []
    fetchMock.mockResolvedValue(Response.json({ code, detail: 'Problem', fieldErrors }, {
      status, headers: { 'Content-Type': 'application/problem+json' },
    }))
    await expect(updateSubscription('one', body)).rejects.toMatchObject({ status, code, detail: 'Problem', fieldErrors })
  },
)
