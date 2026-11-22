import { request } from './client'
import type { UserResponse } from './types'

export const currentUserKey = ['current-user'] as const
export const getCurrentUser = (signal: AbortSignal) =>
  request<UserResponse>('/api/v1/users/me', { authenticated: true, signal })
