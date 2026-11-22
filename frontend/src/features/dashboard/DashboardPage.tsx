import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router'
import Alert from '../../components/Alert'
import Button from '../../components/Button'
import { categories, cycles, formatCalendarDate, formatINR } from '../../lib/subscriptionFormatting'
import { useAccount } from '../auth/account'
import { dashboardQuery } from './queries'
import styles from './Dashboard.module.css'

function daysUntil(days: number) {
  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  return `In ${days} days`
}

export default function DashboardPage() {
  const query = useQuery(dashboardQuery(useAccount()))
  const data = query.data
  return <section>
    <h1>Dashboard</h1>
    {query.isError ? <>
      <Alert error>Could not load your dashboard.</Alert>
      <Button disabled={query.isFetching} onClick={() => void query.refetch()}>Retry</Button>
    </> : !data ? <Alert>Loading dashboard...</Alert> : <>
      <dl className={styles.metrics}>
        <div><dt>Monthly spend</dt><dd>{formatINR(data.monthlySpend)}</dd></div>
        <div><dt>Yearly spend</dt><dd>{formatINR(data.yearlySpend)}</dd></div>
        <div><dt>Active subscriptions</dt><dd>{data.activeCount}</dd></div>
        <div><dt>Pending trials</dt><dd>{data.trialsPending.count}</dd>
          <dd>{formatINR(data.trialsPending.monthlyIfConverted)} per month if converted</dd></div>
      </dl>
      {data.activeCount === 0 && <p>No active subscriptions. <Link to="/subscriptions/new">Add subscription</Link></p>}
      <h2>Category spend</h2>
      {data.categoryBreakdown.length === 0 ? <Alert>No paying spend yet.</Alert> :
        <ul className={styles.list}>{data.categoryBreakdown.map(item => <li key={item.category}>
          <strong>{categories[item.category]}</strong>
          <p>{item.count} {item.count === 1 ? 'subscription' : 'subscriptions'} · {formatINR(item.monthlySpend)} monthly · {formatINR(item.yearlySpend)} yearly</p>
          <div className={styles.track} aria-hidden="true">
            <div className={styles.bar} style={{ width: `${100 * item.yearlySpend / data.yearlySpend}%` }} />
          </div>
        </li>)}</ul>}
      <h2>Upcoming renewals</h2>
      {data.upcomingRenewals.length === 0 ? <Alert>Nothing renews in the next 30 days.</Alert> :
        <ul className={styles.list}>{data.upcomingRenewals.map(item => <li key={item.id}>
          <Link to={`/subscriptions/${encodeURIComponent(item.id)}/edit`}>{item.name}</Link>
          {item.isTrial && <span className={styles.badge}>Trial</span>}
          <p>{categories[item.category]} · {formatINR(item.amount)} · {cycles[item.billingCycle]}</p>
          <time dateTime={item.nextBillingDate}>{formatCalendarDate(item.nextBillingDate)}</time> · {daysUntil(item.daysUntil)}
        </li>)}</ul>}
    </>}
  </section>
}
