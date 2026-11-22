import { beforeEach, describe, expect, it, vi } from 'vitest'
import { login, register } from './auth'
import { getCurrentUser } from './users'
import { readSession, storeSession } from '../features/auth/session'

const credentials = { email: 'a@b', password: 'password' }
const session = { accessToken: 'example', expiresAt: '2099-01-01T00:00:00Z' }
const fetchMock = vi.fn<typeof fetch>()

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
  vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8080')
})

describe('API transport', () => {
  it('decodes JSON and sends the expected paths, headers and body', async () => {
    storeSession(session)
    const user = { id: 'id', email: 'a@b', createdAt: '2026-01-01T00:00:00Z' }
    fetchMock.mockResolvedValueOnce(Response.json(user, { status: 201 }))
      .mockResolvedValueOnce(Response.json(session)).mockResolvedValueOnce(Response.json(user))
    expect(await register(credentials)).toEqual(user)
    expect(await login(credentials)).toEqual(session)
    expect(await getCurrentUser(new AbortController().signal)).toEqual(user)
    for (const [index, action] of ['register', 'login'].entries()) {
      const [url, init] = fetchMock.mock.calls[index] ?? []
      expect(url).toBe('http://localhost:8080/api/v1/auth/' + action)
      expect(init).toMatchObject({ method: 'POST', body: JSON.stringify(credentials) })
      expect(new Headers(init?.headers).get('Content-Type')).toBe('application/json')
      expect(new Headers(init?.headers).has('Authorization')).toBe(false)
    }
    const [url, init] = fetchMock.mock.calls[2] ?? []
    expect(url).toBe('http://localhost:8080/api/v1/users/me')
    expect(init?.method).toBe('GET')
    expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer example')
  })

  it.each([undefined, [{ field: 'email', message: 'First' }, { field: 'email', message: 'Second' }]])(
    'parses ProblemDetail with optional field errors %j', async fieldErrors => {
      fetchMock.mockResolvedValue(new Response(JSON.stringify({ code: 'validation_failed', detail: 'Invalid', fieldErrors }), {
        status: 400, headers: { 'Content-Type': 'application/problem+json; charset=utf-8' },
      }))
      await expect(register(credentials)).rejects.toMatchObject({ status: 400, code: 'validation_failed', detail: 'Invalid', fieldErrors: fieldErrors ?? [] })
    },
  )

  it.each([
    ['{', 'application/problem+json'],
    ['{}', 'application/problem+json'],
    ['failure', 'text/plain'],
    [null, 'application/problem+json'],
  ])('falls back for unusable bodies', async (body, type) => {
    fetchMock.mockResolvedValue(new Response(body, { status: 503, headers: { 'Content-Type': type } }))
    await expect(login(credentials)).rejects.toMatchObject({ status: 503, code: 'request_failed', fieldErrors: [] })
  })

  it('distinguishes network rejection and abort', async () => {
    const abort = new DOMException('Aborted', 'AbortError')
    fetchMock.mockRejectedValueOnce(new TypeError('offline')).mockRejectedValueOnce(abort)
    await expect(login(credentials)).rejects.toMatchObject({ status: 0, code: 'network_error' })
    storeSession(session)
    await expect(getCurrentUser(new AbortController().signal)).rejects.toBe(abort)
  })

  it('makes one request per 401 and clears only a protected session', async () => {
    storeSession(session)
    fetchMock.mockResolvedValueOnce(Response.json({ code: 'invalid_credentials', detail: 'Authentication failed.' }, {
      status: 401, headers: { 'Content-Type': 'application/problem+json' },
    })).mockResolvedValueOnce(new Response('Unusable', { status: 401 }))
    await expect(login(credentials)).rejects.toMatchObject({ status: 401, code: 'invalid_credentials' })
    expect(readSession().session).toEqual(session)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    await expect(getCurrentUser(new AbortController().signal)).rejects.toMatchObject({ status: 401 })
    expect(readSession().session).toBeNull()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
