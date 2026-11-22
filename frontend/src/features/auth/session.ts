import type { LoginResponse } from '../../api/types'

const key = 'cross.session'

export function clearSession() {
  sessionStorage.removeItem(key)
}

export function readSession(): { session: LoginResponse | null; expired: boolean } {
  const raw = sessionStorage.getItem(key)
  if (raw !== null) {
    try {
      const record = JSON.parse(raw)
      if (typeof record?.accessToken === 'string' && record.accessToken.trim() &&
          typeof record.expiresAt === 'string' && Number.isFinite(Date.parse(record.expiresAt))) {
        if (Date.now() < Date.parse(record.expiresAt)) {
          return { session: { accessToken: record.accessToken.trim(), expiresAt: record.expiresAt }, expired: false }
        }
        clearSession()
        return { session: null, expired: true }
      }
    } catch {
      // Invalid stored JSON is discarded below.
    }
    clearSession()
  }
  return { session: null, expired: false }
}

const rejectionListeners = new Set<() => void>()

export function onSessionRejected(listener: () => void) {
  rejectionListeners.add(listener)
  return () => { rejectionListeners.delete(listener) }
}

export function rejectSession(rejected: LoginResponse) {
  const current = readSession().session
  if (current?.accessToken !== rejected.accessToken || current.expiresAt !== rejected.expiresAt) return
  clearSession()
  for (const listener of rejectionListeners) listener()
}

export function storeSession(session: LoginResponse) {
  sessionStorage.setItem(key, JSON.stringify({
    accessToken: session.accessToken.trim(),
    expiresAt: session.expiresAt,
  }))
  return readSession().session
}
