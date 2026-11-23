import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { ArrowUpRight, CalendarDays, CalendarRange, ChevronRight, Clock, Layers, Wallet } from 'lucide-react'
import { Link } from 'react-router'
import AddSubscriptionLink from '../../components/AddSubscriptionLink'
import Alert from '../../components/Alert'
import Button from '../../components/Button'
import CategoryIcon from '../../components/CategoryIcon'
import { EASE_OUT, useMotionEnabled } from '../../lib/motion'
import { cycles, formatCalendarDate, formatINR } from '../../lib/subscriptionFormatting'
import actions from '../../styles/Actions.module.css'
import { useAccount } from '../auth/account'
import CategorySpendCard from './CategorySpendCard'
import CountUp from './CountUp'
import { dashboardQuery } from './queries'
import styles from './Dashboard.module.css'

const MotionLink = motion.create(Link)
const formatCount = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format
const hoverTransition = { duration: .18, ease: EASE_OUT }

const renewalDelay = (index: number) => .18 + index * .06

function renewalLabel(days: number) {
  if (days === 0) return 'Due today'
  if (days === 1) return 'Due tomorrow'
  return 'Renews in ' + days + ' days'
}

export default function DashboardPage() {
  const enabled = useMotionEnabled()
  const query = useQuery(dashboardQuery(useAccount()))
  const data = query.data
  const dueSoon = data?.upcomingRenewals.filter(({ daysUntil }) => daysUntil >= 0 && daysUntil <= 7) ?? []
  const dueSoonTotal = dueSoon.reduce((total, renewal) => total + renewal.amount, 0)
  const reveal = (y: number, blur: number, delay = 0) => ({
    initial: enabled ? { opacity: 0, y, filter: 'blur(' + blur + 'px)' } : false as const,
    animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
    transition: { duration: enabled ? .35 : 0, ease: EASE_OUT, delay: enabled ? delay : 0 },
  })
  const metrics = data ? [
    { label: 'Monthly spend', Icon: Wallet, value: data.monthlySpend, format: formatINR },
    { label: 'Yearly spend', Icon: CalendarRange, value: data.yearlySpend, format: formatINR },
    { label: 'Active subscriptions', Icon: Layers, value: data.activeCount, format: formatCount },
    { label: 'Pending trials', Icon: Clock, value: data.trialsPending.count, format: formatCount, trialCost: data.trialsPending.monthlyIfConverted },
  ] : []

  return <section aria-labelledby="dashboard-title">
    <header className={styles.pageHeader}>
      <motion.div {...reveal(8, 4)}>
        <h1 id="dashboard-title">Dashboard</h1>
        <p>Track what you spend and see what renews next.</p>
      </motion.div>
      <AddSubscriptionLink dashboard />
    </header>
    {query.isError ? <>
      <Alert error>Could not load your dashboard.</Alert>
      <Button disabled={query.isFetching} onClick={() => void query.refetch()}>Retry</Button>
    </> : !data ? <Alert>Loading dashboard...</Alert> : <>
      <dl className={styles.metrics}>
        {metrics.map(({ label, Icon, value, format, trialCost }, index) => <motion.div key={label}
          {...reveal(6, 3, index * .06)} whileHover={enabled ? 'hover' : undefined}>
          {index > 0 && <motion.span aria-hidden="true" className={styles.metricDivider}
            initial={enabled ? { scaleY: 0 } : false} animate={{ scaleY: 1 }}
            transition={enabled ? { duration: .45, delay: index * .06, ease: EASE_OUT } : { duration: 0 }} />}
          <dt>
            <motion.span className={styles.inlineIcon} variants={{ hover: { scale: 1.12 } }} transition={hoverTransition}>
              <Icon className={styles.metricIcon} aria-hidden="true" />
            </motion.span>
            {label}
            {trialCost !== undefined && value > 0 && <span className={styles.trialDot} aria-hidden="true">
              {enabled && <motion.span className={styles.sonar} animate={{ scale: [1, 2.2], opacity: [.55, 0] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: 'easeOut' }} />}
            </span>}
          </dt>
          <dd><CountUp value={value} format={format} enabled={enabled} delay={index * .06} /></dd>
          {trialCost !== undefined && <dd className={styles.trialCost}>
            <CountUp value={trialCost} format={formatINR} enabled={enabled} delay={index * .06} /> per month if converted
          </dd>}
        </motion.div>)}
      </dl>
      <div className={styles.bento}>
        <motion.section className={styles.card} aria-labelledby="renewals-title" {...reveal(14, 4, .12)}>
          <header className={styles.cardHeader}>
            <h2 id="renewals-title">Upcoming renewals</h2>
            <MotionLink to="/subscriptions" whileHover={enabled ? 'hover' : undefined}>
              View all <motion.span className={styles.inlineIcon} variants={{ hover: { x: 2, y: -2 } }} transition={hoverTransition}>
                <ArrowUpRight size={14} aria-hidden="true" />
              </motion.span>
            </MotionLink>
          </header>
          {dueSoon.length > 0 && <motion.p className={styles.renewalCallout} {...reveal(6, 2, .22)}>
            <motion.span className={styles.trialDot} aria-hidden="true"
              animate={enabled ? { scale: [1, 1.14, 1], opacity: [1, .76, 1] } : { scale: 1, opacity: 1 }}
              transition={enabled ? { duration: 2.4, repeat: Infinity, ease: 'easeInOut' } : { duration: 0 }} />
            {enabled ? <span>
              {dueSoon.length} {dueSoon.length === 1 ? 'renewal' : 'renewals'} due within 7 days &middot; <CountUp value={dueSoonTotal} format={formatINR} enabled={enabled} delay={.22} />
            </span> : <>{dueSoon.length} {dueSoon.length === 1 ? 'renewal' : 'renewals'} due within 7 days &middot; {formatINR(dueSoonTotal)}</>}
          </motion.p>}
          {data.upcomingRenewals.length === 0 ? <div className={styles.empty}>
            <span className={styles.icon}><CalendarDays size={20} aria-hidden="true" /></span>
            <p>Nothing renews in the next 30 days.</p>
            {data.activeCount === 0 && <p>No active subscriptions.</p>}
            <Link className={actions.secondary + ' ' + styles.pill} to="/subscriptions/new">Add a subscription</Link>
          </div> : <ul className={styles.list}>
            {data.upcomingRenewals.map((item, index) => <motion.li key={item.id} className={styles.renewal}
              {...reveal(10, 3, renewalDelay(index))} whileHover={enabled ? 'hover' : undefined}>
              <motion.span className={styles.icon} variants={{ hover: { scale: 1.06 } }} transition={hoverTransition}>
                <CategoryIcon category={item.category} />
              </motion.span>
              <div className={styles.renewalDetail}>
                <Link to={'/subscriptions/' + encodeURIComponent(item.id) + '/edit'}>
                  <motion.span className={styles.renewalName} variants={{ hover: { x: 2 } }} transition={hoverTransition}>{item.name}</motion.span>
                </Link>
                <motion.div className={styles.badges} variants={{ hover: { x: 2 } }} transition={hoverTransition}>
                  <p><time dateTime={item.nextBillingDate}>{formatCalendarDate(item.nextBillingDate)}</time> &middot; {cycles[item.billingCycle]}</p>
                  <motion.span className={item.daysUntil <= 1 ? styles.urgent : item.daysUntil <= 3 ? styles.warning : styles.badge}
                    animate={enabled && item.daysUntil === 0 ? { opacity: [1, .72, 1] } : { opacity: 1 }}
                    transition={enabled && item.daysUntil === 0 ? { duration: 2.4, repeat: Infinity, ease: 'easeInOut' } : { duration: 0 }}>
                    {renewalLabel(item.daysUntil)}
                  </motion.span>
                  {item.isTrial && <span className={styles.badge}>Trial</span>}
                </motion.div>
              </div>
              <strong className={styles.money}>
                <CountUp value={item.amount} format={formatINR} enabled={enabled} duration={.8} delay={renewalDelay(index)} />
              </strong>
              <motion.span className={styles.renewalArrow} aria-hidden="true" variants={{ hover: { x: 4 } }} transition={hoverTransition}>
                <ChevronRight size={16} />
              </motion.span>
            </motion.li>)}
          </ul>}
        </motion.section>
        <CategorySpendCard breakdown={data.categoryBreakdown} monthlySpend={data.monthlySpend} yearlySpend={data.yearlySpend} enabled={enabled} />
      </div>
    </>}
  </section>
}
