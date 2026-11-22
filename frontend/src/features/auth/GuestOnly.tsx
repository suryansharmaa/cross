import { Navigate, Outlet } from 'react-router'
import { useAuth } from './auth-context'
import ProfileStatus from './ProfileStatus'

export default function GuestOnly() {
  const { user, restoring, failed } = useAuth()
  if (restoring || failed) return <ProfileStatus />
  return user ? <Navigate to="/" replace /> : <Outlet />
}
