import { queryOptions } from '@tanstack/react-query'
import { getDashboard } from '../../api/dashboard'

export const dashboardKey = (userId: string) => ['dashboard', userId] as const
export const dashboardQuery = (userId: string) => queryOptions({
  queryKey: dashboardKey(userId),
  queryFn: ({ signal }) => getDashboard(signal),
  retry: false,
})
