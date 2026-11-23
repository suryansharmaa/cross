import { Bell, Clock } from 'lucide-react'
import type { NotificationItem } from '../../api/types'
import Button from '../../components/Button'
import { formatCalendarDate, formatTimestamp } from '../../lib/subscriptionFormatting'
import styles from './Notifications.module.css'

export default function NotificationCard({ item, locked, read }: {
  item: NotificationItem
  locked: boolean
  read: () => void
}) {
  const isUnread = !item.readAt
  const trial = item.kind === 'TRIAL_ENDING'
  const Icon = trial ? Clock : Bell
  return <li className={styles.card}>
    <span className={styles.icon}><Icon size={16} aria-hidden="true" /></span>
    <div className={styles.content}>
      <p className={isUnread ? styles.unreadMessage : styles.message}>{item.message}</p>
      <div className={styles.metadata}>
        <span>{trial ? 'Trial ending' : 'Renewal'}</span>
        <span className={item.alertType === 'THREE_DAYS' ? styles.warning : styles.urgent}>
          {item.alertType === 'THREE_DAYS' ? '3 days before' : '1 day before'}
        </span>
        {isUnread && <span className={styles.unread}><span aria-hidden="true" />Unread</span>}
      </div>
      <div className={styles.metadata}>
        <span>Billing date <time dateTime={item.billingDate}>{formatCalendarDate(item.billingDate)}</time></span>
        <span>Received <time dateTime={item.createdAt}>{formatTimestamp(item.createdAt)}</time></span>
      </div>
    </div>
    {isUnread ? <Button className={styles.markRead} disabled={locked} onClick={read}>Mark as read</Button> :
      <span className={styles.read}>Read</span>}
  </li>
}
