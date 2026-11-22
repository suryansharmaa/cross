import type { NotificationItem } from '../../api/types'
import Button from '../../components/Button'
import { formatCalendarDate, formatTimestamp } from '../../lib/subscriptionFormatting'
import styles from './Notifications.module.css'

export default function NotificationCard({ item, locked, read }: {
  item: NotificationItem
  locked: boolean
  read: () => void
}) {
  return <li className={styles.card}>
    <div className={styles.actions}>
      <strong className={styles.badge}>{item.kind === 'TRIAL_ENDING' ? 'Trial ending' : 'Renewal'}</strong>
      <span className={item.readAt ? styles.read : styles.unread}>{item.readAt ? 'Read' : 'Unread'}</span>
    </div>
    <p>{item.message}</p>
    <p>Billing date <time dateTime={item.billingDate}>{formatCalendarDate(item.billingDate)}</time></p>
    <p>Received <time dateTime={item.createdAt}>{formatTimestamp(item.createdAt)}</time></p>
    {!item.readAt && <Button disabled={locked} onClick={read}>Mark as read</Button>}
  </li>
}
