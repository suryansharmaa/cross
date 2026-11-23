import type { ReactNode } from 'react'
import { Bell } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { NavLink } from 'react-router'
import { useAccount } from '../auth/account'
import { unreadCountQuery } from './queries'
import styles from './Notifications.module.css'

export default function NotificationsLink({ activeIndicator }: { activeIndicator?: ReactNode }) {
  const { data } = useQuery(unreadCountQuery(useAccount()))
  return <NavLink className={styles.bell} to="/notifications"
    aria-label={data ? `Notifications, ${data.count} unread` : 'Notifications'}>
    {({ isActive }) => <>
    {isActive && activeIndicator}
    <Bell size={20} aria-hidden="true" />
    Notifications
    {data && data.count > 0 && <span className={styles.badge} aria-hidden="true">{data.count}</span>}
    </>}
  </NavLink>
}
