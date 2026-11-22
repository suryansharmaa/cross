import { createContext, useContext } from 'react'
import type { Credentials, UserResponse } from '../../api/types'

export const AuthContext = createContext<{
  user: UserResponse | undefined
  restoring: boolean
  failed: boolean
  retry: () => void
  signIn: (credentials: Credentials) => Promise<void>
  signOut: () => void
  accountDeleted: () => void
} | null>(null)

export function useAuth() {
  const auth = useContext(AuthContext)
  if (!auth) throw new Error('AuthProvider is required')
  return auth
}

