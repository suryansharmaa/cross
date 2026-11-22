import { request } from './client'
import type { Credentials, LoginResponse, UserResponse } from './types'

export const register = (body: Credentials) => request<UserResponse>('/api/v1/auth/register', { body })
export const login = (body: Credentials) => request<LoginResponse>('/api/v1/auth/login', { body })
