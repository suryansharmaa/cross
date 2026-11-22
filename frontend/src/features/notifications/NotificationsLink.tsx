import { useQuery } from '@tanstack/react-query'
import { NavLink } from 'react-router'
import { useAccount } from '../auth/account'
import { unreadCountQuery } from './queries'
import styles from './Notifications.module.css'

export default function NotificationsLink() {
  const { data } = useQuery(unreadCountQuery(useAccount()))
  return <NavLink className={styles.bell} to="/notifications"
    aria-label={data ? `Notifications, ${data.count} unread` : 'Notifications'}>
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 20a2 2 0 0 0 4 0" />
    </svg>
    {data && data.count > 0 && <span className={styles.badge} aria-hidden="true">{data.count}</span>}
  </NavLink>
}
