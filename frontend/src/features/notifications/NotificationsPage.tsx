import { FilterButton, ListTransition } from '../../components/Motion'
import { useRef, useState } from 'react'
import { Bell, CheckCheck } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiError } from '../../api/client'
import { markAllRead, markRead } from '../../api/notifications'
import Alert from '../../components/Alert'
import Button from '../../components/Button'
import { sessionGuard, useAccount } from '../auth/account'
import NotificationCard from './NotificationCard'
import { notificationsKey, notificationsQuery, unreadCountQuery } from './queries'
import ledgerControls from '../subscriptions/Subscriptions.module.css'
import styles from './Notifications.module.css'

export default function NotificationsPage() {
  const account = useAccount()
  const cache = useQueryClient()
  const [unread, setUnread] = useState(false)
  const [page, setPage] = useState(0)
  const [error, setError] = useState('')
  const [locked, setLocked] = useState(false)
  const [notice, setNotice] = useState('')
  const heading = useRef<HTMLHeadingElement>(null)
  const busy = useRef(false)
  const query = useQuery(notificationsQuery(account, unread, page))
  const count = useQuery(unreadCountQuery(account))
  const mutation = useMutation({
    mutationFn: async (id: string | null) => {
      if (id === null) await markAllRead()
      else await markRead(id)
    },
    retry: false,
  })
  const data = query.data
  const last = Math.max(0, (data?.totalPages ?? 1) - 1)
  if (data && page > last) setPage(last)

  async function read(id: string | null) {
    if (busy.current) return
    busy.current = true
    setLocked(true)
    const current = sessionGuard()
    const refresh = () => cache.invalidateQueries({ queryKey: notificationsKey(account) })
    setNotice('')
    setError('')
    try {
      await mutation.mutateAsync(id)
      if (!current()) return
      heading.current?.focus()
      await refresh()
      if (current()) setNotice(id === null ? 'All notifications marked as read.' : 'Notification marked as read.')
    } catch (failure) {
      if (!current()) return
      setError(failure instanceof ApiError ? failure.detail : 'Could not mark notifications as read.')
      if (failure instanceof ApiError && failure.code === 'notification_not_found') await refresh()
    } finally {
      busy.current = false
      setLocked(false)
    }
  }


  return <section className={styles.page} aria-labelledby="notifications-heading">
    <header className={styles.header}>
      <div>
        <h1 id="notifications-heading" ref={heading} tabIndex={-1}>Notifications</h1>
        <p>Stay ahead of trial endings and upcoming billing renewals.</p>
      </div>
      <Button className={styles.markAll} disabled={locked || (count.data?.count ?? 0) === 0}
        onClick={() => void read(null)}>
        <CheckCheck size={16} aria-hidden="true" />Mark all as read
      </Button>
    </header>
    <div className={ledgerControls.filters} role="group" aria-label="Notification filter">
      {[false, true].map(filter => <FilterButton id="notif-filter-pill" className={ledgerControls.filter} key={String(filter)} active={unread === filter}
        onClick={() => { if (unread !== filter) { setUnread(filter); setPage(0) } }}>
        {filter ? 'Unread' : 'All'}
      </FilterButton>)}
    </div>
    {locked && <Alert>Marking notifications as read...</Alert>}
    {notice && <Alert>{notice}</Alert>}
    {error && <Alert error>{error}</Alert>}
    {count.isError && <div className={styles.actions}>
      <Alert error>Could not load the unread count.</Alert>
      <Button disabled={count.isFetching} onClick={() => void count.refetch()}>Retry unread count</Button>
    </div>}
    <ListTransition listKey={String(unread) + ':' + page} ready={!query.isError && page <= last && !!data} className={styles.list}>
      {!query.isError && page <= last && data?.items.map(item => <NotificationCard key={item.id} item={item}
          locked={locked} read={() => void read(item.id)} />)}
    </ListTransition>
    {query.isError ? <>
      <Alert error>Could not load notifications.</Alert>
      <Button disabled={query.isFetching} onClick={() => void query.refetch()}>Retry</Button>
    </> : !data || page > last ? <Alert>Loading notifications...</Alert> : <>
      {data.items.length === 0 && <div className={styles.empty} role="status">
        <span className={styles.emptyIcon}><Bell size={20} aria-hidden="true" /></span>
        <p>{unread ? 'No unread notifications.' : 'No notifications yet.'}</p>
        {!unread && <p>Reminders appear here 3 days and 1 day before a trial ends or a plan renews.</p>}
      </div>}
    </>}
    {!query.isError && page <= last && data && <>
      <nav className={ledgerControls.pagination} aria-label="Notification pages">
        <Button className={ledgerControls.pageButton} disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</Button>
        <span aria-live="polite">Page {page + 1} of {last + 1}</span>
        <Button className={ledgerControls.pageButton} disabled={page >= last} onClick={() => setPage(page + 1)}>Next</Button>
      </nav>
    </>}
  </section>
}


