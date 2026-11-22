import { request } from './client'
import type { DashboardResponse } from './types'

export const getDashboard = (signal: AbortSignal) =>
  request<DashboardResponse>('/api/v1/dashboard', { authenticated: true, signal })
