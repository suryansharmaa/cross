import { expect, it, vi } from 'vitest'
import { clearSession, readSession, storeSession } from './session'

const expiresAt = '2027-01-01T00:00:00Z'

it('stores and reads the trimmed token, then clears the single entry', () => {
  vi.useFakeTimers()
  vi.setSystemTime(Date.parse(expiresAt) - 1)
  const expected = { accessToken: 'token', expiresAt }
  expect(readSession()).toEqual({ session: null, expired: false })
  expect(storeSession({ ...expected, accessToken: ' token ' })).toEqual(expected)
  expect(sessionStorage.length).toBe(1)
  expect(readSession()).toEqual({ session: expected, expired: false })
  clearSession()
  expect(sessionStorage.length).toBe(0)
})

it('expires at the exact server deadline', () => {
  vi.useFakeTimers()
  vi.setSystemTime(Date.parse(expiresAt) - 1)
  storeSession({ accessToken: 'token', expiresAt })
  expect(readSession().session).not.toBeNull()
  vi.setSystemTime(Date.parse(expiresAt))
  expect(readSession()).toEqual({ session: null, expired: true })
  expect(sessionStorage.length).toBe(0)
})

it.each(['{', 'null', '{}', '{"accessToken":8}', '{"accessToken":" ","expiresAt":"2099-01-01"}',
  '{"accessToken":"token","expiresAt":"invalid"}'])('clears malformed storage %s', raw => {
  sessionStorage.setItem('cross.session', raw)
  expect(readSession()).toEqual({ session: null, expired: false })
  expect(sessionStorage.length).toBe(0)
})
