import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Navigate, useLocation, useNavigate } from 'react-router'
import { ApiError } from '../../api/client'
import { login } from '../../api/auth'
import type { Credentials } from '../../api/types'
import { currentUserKey, getCurrentUser } from '../../api/users'
import { AuthContext } from './auth-context'
import { clearSession, onSessionRejected, readSession, storeSession } from './session'

const profile = {
  queryKey: currentUserKey,
  queryFn: ({ signal }: { signal: AbortSignal }) => getCurrentUser(signal),
  retry: false,
  staleTime: Infinity,
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
}
const expiredNotice = 'Your session expired. Please log in again.'

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [initial] = useState(readSession)
  const [session, setSession] = useState(initial.session)
  const { key: locationKey } = useLocation()
  const latestLocation = useRef(locationKey)
  useEffect(() => { latestLocation.current = locationKey }, [locationKey])
  const [loginRedirect, setLoginRedirect] = useState<{ from: string; notice?: string } | null>(
    initial.expired ? { from: locationKey, notice: expiredNotice } : null,
  )
  const navigate = useNavigate()
  const cache = useQueryClient()
  // A disabled observer still creates a cache entry, so it uses a separate key when signed out.
  const query = useQuery({
    ...profile,
    queryKey: session ? currentUserKey : ['signed-out'],
    enabled: session !== null,
  })
  const unauthorized = query.error instanceof ApiError && query.error.status === 401

  const discard = useCallback(() => {
    clearSession()
    setSession(null)
    void cache.cancelQueries()
    cache.removeQueries()
  }, [cache])

  const endSession = useCallback((notice?: string) => {
    discard()
    setLoginRedirect({ from: latestLocation.current, notice })
  }, [discard])

  useEffect(() => session ? onSessionRejected(() => endSession(expiredNotice)) : undefined, [session, endSession])

  useEffect(() => {
    if (!session || !unauthorized) return
    const redirect = setTimeout(() => endSession(expiredNotice), 0)
    return () => clearTimeout(redirect)
  }, [session, unauthorized, endSession])

  useEffect(() => {
    if (!session) return
    let timer: ReturnType<typeof setTimeout>
    function check() {
      const remaining = Date.parse(session?.expiresAt ?? '') - Date.now()
      if (remaining <= 0) endSession(expiredNotice)
      else timer = setTimeout(check, Math.min(remaining, 2_147_483_647))
    }
    check()
    return () => clearTimeout(timer)
  }, [session, endSession])

  async function signIn(credentials: Credentials) {
    const provisional = storeSession(await login(credentials))
    try {
      if (!provisional) throw new ApiError(401, 'session_expired', expiredNotice)
      await cache.fetchQuery(profile)
      if (!readSession().session) throw new ApiError(401, 'session_expired', expiredNotice)
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        endSession(expiredNotice)
        return
      }
      discard()
      throw new ApiError(0, 'profile_failed', 'Could not load your account. Please try again.')
    }
    setSession(provisional)
    void navigate('/', { replace: true })
  }

  if (loginRedirect?.from === locationKey) {
    return <Navigate to="/login" replace state={{ notice: loginRedirect.notice }} />
  }

  return <AuthContext.Provider value={{
    user: session && !unauthorized ? query.data : undefined,
    restoring: session !== null && (query.isPending || query.isFetching || unauthorized),
    failed: session !== null && query.isError && !unauthorized,
    retry: () => { void query.refetch() },
    signIn,
    signOut: () => endSession(),
    accountDeleted: () => endSession('Your account has been deleted.'),
  }}>{children}</AuthContext.Provider>
}

