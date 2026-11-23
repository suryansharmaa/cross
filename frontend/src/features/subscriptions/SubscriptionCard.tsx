import { motion, useIsPresent } from 'framer-motion'
import { Collapse, MotionPresence } from '../../components/Motion'
import { Pencil, Trash2 } from 'lucide-react'
import CategoryIcon from '../../components/CategoryIcon'
import { useEffect, useId, useRef } from 'react'
import { Link } from 'react-router'
import type { Subscription } from '../../api/types'
import Button from '../../components/Button'
import { EASE_OUT, useMotionEnabled } from '../../lib/motion'
import { categories, cycles, formatCalendarDate, formatINR, formatInstantDate } from '../../lib/subscriptionFormatting'
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
  const enabled = useMotionEnabled()
  const present = useIsPresent()
  const label = useId()
  const back = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (action) back.current?.focus({ preventScroll: true })
  }, [action])
  return <motion.li className={styles.row} inert={!present}
    exit={enabled ? 'removed' : undefined}
    variants={{ removed: (deletedId?: string) => deletedId === item.id ? {
      opacity: 0, height: 0, paddingBlock: 0, borderTopWidth: 0, overflow: 'hidden',
      transition: { duration: .15, ease: EASE_OUT },
    } : {} }}>
    <div className={styles.rowBody}>
      <div className={styles.rowDetails}>
        <span className={styles.categoryIcon}><CategoryIcon category={item.category} /></span>
        <div className={styles.identity}>
          <h2>{item.name}</h2>
          <div className={styles.metadata}>
            <span>{categories[item.category]}</span>
            <span className={active && item.isTrial ? styles.trial : styles.badge}>
              {active ? item.isTrial ? 'Trial' : 'Active' : 'Cancelled'}
            </span>
          </div>
        </div>
      </div>
      <div className={styles.billing}>
        <p>{active ? 'Next billing ' : 'Ended '}
          {active && item.nextBillingDate ?
            <time dateTime={item.nextBillingDate}>{formatCalendarDate(item.nextBillingDate)}</time> :
            !active && item.cancelledAt ?
              <time dateTime={item.cancelledAt}>{formatInstantDate(item.cancelledAt)}</time> : '\u2014'}
        </p>
        <p>{cycles[item.billingCycle]}</p>
      </div>
      <strong className={styles.amount}>{formatINR(item.amount)}</strong>
      <div className={styles.rowActions}>
        {active && <Link className={styles.rowEdit} to={'/subscriptions/' + item.id + '/edit'}>
          <Pencil size={14} aria-hidden="true" />Edit
        </Link>}
        {active && <Button className={styles.rowCancel} disabled={locked}
          onClick={event => choose('Cancel', event.currentTarget)}>Cancel</Button>}
        <Button className={styles.rowDelete} disabled={locked}
          onClick={event => choose('Delete', event.currentTarget)}><Trash2 size={14} aria-hidden="true" />Delete</Button>
      </div>
      {item.notes && <p className={styles.notes}>{item.notes}</p>}
    </div>
    <div className={styles.drawer}>
      <MotionPresence>
        {action && <Collapse key="confirmation" duration={.15}>
          <div className={styles.drawerContent}>
            <div role="group" aria-labelledby={label} className={styles.confirm}
              onKeyDown={event => { if (event.key === 'Escape' && !pending) dismiss() }}>
              <p id={label}>{action} {item.name}?</p>
              <p>{action === 'Delete' ? 'This permanently removes the subscription.' : 'The subscription will be marked cancelled.'}</p>
              <div className={styles.actions}>
                <Button className={styles.rowEdit} ref={back} disabled={pending} onClick={dismiss}>Go back</Button>
                <Button className={action === 'Delete' ? styles.rowDelete : styles.rowButton} disabled={pending} onClick={confirm}>Confirm {action.toLowerCase()}</Button>
              </div>
            </div>
          </div>
        </Collapse>}
      </MotionPresence>
    </div>
  </motion.li>
}
