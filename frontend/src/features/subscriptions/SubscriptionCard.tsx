import { useEffect, useId, useRef } from 'react'
import { Link } from 'react-router'
import type { Subscription } from '../../api/types'
import Button from '../../components/Button'
import { categories, cycles, formatCalendarDate, formatINR } from '../../lib/subscriptionFormatting'
import styles from './Subscriptions.module.css'

export type Action = 'Cancel' | 'Delete'

export default function SubscriptionCard({ item, action, locked, pending, choose, dismiss, confirm }: {
  item: Subscription
  action?: Action
  locked: boolean
  pending: boolean
  choose: (action: Action, trigger: HTMLButtonElement) => void
  dismiss: () => void
  confirm: () => void
}) {
  const active = item.status === 'ACTIVE'
  const label = useId()
  const back = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (action) back.current?.focus()
  }, [action])
  return <li className={styles.card}>
    <h2>{item.name}</h2>
    <div className={styles.actions}>
      <span className={styles.badge}>{categories[item.category]}</span>
      <span className={styles.badge}>{active ? item.isTrial ? 'Trial' : 'Active' : 'Cancelled'}</span>
    </div>
    <p>{formatINR(item.amount)} &middot; {cycles[item.billingCycle]}</p>
    <p>Next billing date {active && item.nextBillingDate ? <time dateTime={item.nextBillingDate}>
      {formatCalendarDate(item.nextBillingDate)}</time> : '\u2014'}</p>
    {item.notes && <p className={styles.notes}>{item.notes}</p>}
    <div className={styles.actions}>
      {active && <Link to={'/subscriptions/' + item.id + '/edit'}>Edit</Link>}
      {active && <Button disabled={locked} onClick={event => choose('Cancel', event.currentTarget)}>Cancel</Button>}
      <Button disabled={locked} onClick={event => choose('Delete', event.currentTarget)}>Delete</Button>
    </div>
    {action && <div role="group" aria-labelledby={label} className={styles.confirm}
      onKeyDown={event => { if (event.key === 'Escape' && !pending) dismiss() }}>
      <p id={label}>{action} {item.name}?</p>
      <p>{action === 'Delete' ? 'This permanently removes the subscription.' : 'The subscription will be marked cancelled.'}</p>
      <div className={styles.actions}>
        <Button ref={back} disabled={pending} onClick={dismiss}>Go back</Button>
        <Button disabled={pending} onClick={confirm}>Confirm {action.toLowerCase()}</Button>
      </div>
    </div>}
  </li>
}
