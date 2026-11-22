import { beforeEach, expect, it, vi } from 'vitest'
import { storeSession, readSession } from '../features/auth/session'
import { getDashboard } from './dashboard'
import { getUnreadCount, listNotifications, markAllRead, markRead } from './notifications'
import { deleteAccount } from './users'

const fetchMock = vi.fn<typeof fetch>()
const base = 'http://localhost:8080/api/v1'

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
  vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8080')
  storeSession({ accessToken: 'test-token', expiresAt: '2099-01-01T00:00:00Z' })
})

it('fetches dashboard and notifications with the requested filter, page and signal', async () => {
  const signal = new AbortController().signal
  fetchMock.mockResolvedValueOnce(Response.json({ activeCount: 3 }))
    .mockResolvedValueOnce(Response.json({ items: [], page: 0 }))
    .mockResolvedValueOnce(Response.json({ items: [], page: 2 }))
    .mockResolvedValueOnce(Response.json({ count: 3 }))
  await expect(getDashboard(signal)).resolves.toMatchObject({ activeCount: 3 })
  await expect(listNotifications(0, false, signal)).resolves.toMatchObject({ page: 0 })
  await expect(listNotifications(2, true, signal)).resolves.toMatchObject({ page: 2 })
  await expect(getUnreadCount(signal)).resolves.toEqual({ count: 3 })
  expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
    base + '/dashboard',
    base + '/notifications?page=0&size=20',
    base + '/notifications?page=2&size=20&unreadOnly=true',
    base + '/notifications/unread-count',
  ])
  for (const [, init] of fetchMock.mock.calls) {
    expect(init).toMatchObject({ method: 'GET', signal })
    expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer test-token')
  }
})

it('sends bodyless read and delete requests and accepts a 204', async () => {
  fetchMock.mockResolvedValueOnce(Response.json({ id: 'one' }))
    .mockResolvedValueOnce(Response.json({ updated: 2 }))
    .mockResolvedValueOnce(new Response(null, { status: 204 }))
  await expect(markRead('one')).resolves.toMatchObject({ id: 'one' })
  await expect(markAllRead()).resolves.toEqual({ updated: 2 })
  await expect(deleteAccount()).resolves.toBeUndefined()
  expect(fetchMock.mock.calls.map(([url, init]) => [url, init?.method, init?.body])).toEqual([
    [base + '/notifications/one/read', 'POST', undefined],
    [base + '/notifications/read-all', 'POST', undefined],
    [base + '/users/me', 'DELETE', undefined],
  ])
})

it('propagates typed errors and rejects an unauthorized session', async () => {
  const problem = (status: number, code: string) => Response.json({ code, detail: 'Server detail' }, {
    status, headers: { 'content-type': 'application/problem+json' },
  })
  fetchMock.mockResolvedValueOnce(problem(404, 'notification_not_found'))
    .mockResolvedValueOnce(problem(401, 'invalid_credentials'))
  await expect(markRead('missing')).rejects.toMatchObject({ status: 404, code: 'notification_not_found' })
  expect(readSession().session).not.toBeNull()
  await expect(deleteAccount()).rejects.toMatchObject({ status: 401, code: 'invalid_credentials' })
  expect(readSession().session).toBeNull()
})
