import { useAuth } from './auth-context'
import { readSession } from './session'

export function useAccount() {
  const { user } = useAuth()
  if (!user) throw new Error('This route requires an account')
  return user.id
}
export function sessionGuard() {
  const { session } = readSession()
  return () => session !== null && readSession().session?.accessToken === session.accessToken
}

