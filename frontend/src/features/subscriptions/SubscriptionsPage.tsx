import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useLocation, useNavigate } from 'react-router'
import { ApiError } from '../../api/client'
import { cancelSubscription, deleteSubscription } from '../../api/subscriptions'
import type { SubscriptionStatus } from '../../api/types'
import Alert from '../../components/Alert'
import Button from '../../components/Button'
import SubscriptionCard from './SubscriptionCard'
import type { Action } from './SubscriptionCard'
import { detailQuery, listQuery, refreshSubscriptionViews } from './queries'
import { sessionGuard, useAccount } from '../auth/account'
import styles from './Subscriptions.module.css'

const filters = [{ label: 'All', status: undefined }, { label: 'Active', status: 'ACTIVE' },
  { label: 'Cancelled', status: 'CANCELLED' }] as const

export default function SubscriptionsPage() {
  const [status, setStatus] = useState<SubscriptionStatus>()
  const [page, setPage] = useState(0)
  const [selection, setSelection] = useState<{ id: string; action: Action }>()
  const [error, setError] = useState('')
  const { state } = useLocation()
  const [notice, setNotice] = useState(typeof state?.notice === 'string' ? state.notice : '')
  const navigate = useNavigate()
  const heading = useRef<HTMLHeadingElement>(null)
  const trigger = useRef<HTMLButtonElement | null>(null)
  const restore = useRef(false)
  const busy = useRef(false)
  const account = useAccount()
  const cache = useQueryClient()
  const query = useQuery(listQuery(account, page, status))
  const data = query.data
  const last = Math.max(0, (data?.totalPages ?? 1) - 1)
  const checkAll = status !== undefined && data?.totalElements === 0
  const all = useQuery({ ...listQuery(account, 0), enabled: checkAll })
  const mutation = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: Action }) =>
      action === 'Cancel' ? cancelSubscription(id) : deleteSubscription(id),
    retry: false,
  })

  if (data && page > last) setPage(last)
  useEffect(() => {
    if (typeof state?.notice === 'string') void navigate('/subscriptions', { replace: true, state: null })
  }, [state, navigate])
  useEffect(() => {
    if (selection || !restore.current) return
    restore.current = false
    if (trigger.current?.isConnected) trigger.current.focus()
    else heading.current?.focus()
  }, [selection])

  function dismiss() {
    restore.current = true
    setSelection(undefined)
  }

  async function confirm() {
    if (!selection || busy.current) return
    busy.current = true
    const current = sessionGuard()
    const { id, action } = selection
    const { queryKey } = detailQuery(account, id)
    const refresh = () => { refreshSubscriptionViews(cache, account) }
    setError('')
    setNotice('')
    try {
      const saved = await mutation.mutateAsync(selection)
      if (!current()) return
      if (saved) cache.setQueryData(queryKey, saved)
      else cache.removeQueries({ queryKey })
      trigger.current = null
      dismiss()
      setNotice(action === 'Cancel' ? 'Subscription cancelled.' : 'Subscription deleted.')
      refreshSubscriptionViews(cache, account, action === 'Delete')
    } catch (failure) {
      if (!current()) return
      if (failure instanceof ApiError && (failure.status === 404 || failure.code === 'optimistic_lock_conflict')) {
        trigger.current = null
        dismiss()
        setError(failure.status === 404 ? 'This subscription is no longer available.' : 'The subscription changed. Review the list and confirm again.')
        refresh()
      } else setError(failure instanceof ApiError ? failure.detail : 'Could not complete the action.')
    } finally {
      busy.current = false
    }
  }

  const failed = query.isError || (checkAll && all.isError)
  const loading = query.isPending || (checkAll && all.isPending) || page > last
  return <section className={styles.page}>
    <div className={styles.toolbar}>
      <h1 tabIndex={-1} ref={heading}>Subscriptions</h1>
      <Link to="/subscriptions/new">Add subscription</Link>
    </div>
    <div className={styles.actions} role="group" aria-label="Subscription status">
      {filters.map(filter => <Button key={filter.label} disabled={!!selection} aria-pressed={status === filter.status}
        onClick={() => { setStatus(filter.status); setPage(0) }}>{filter.label}</Button>)}
    </div>
    {notice && <Alert>{notice}</Alert>}
    {error && <Alert error>{error}</Alert>}
    {mutation.isPending && <Alert>{selection?.action === 'Cancel' ? 'Cancelling subscription...' : 'Deleting subscription...'}</Alert>}
    {failed ? <>
      <Alert error>Could not load subscriptions.</Alert>
      <Button onClick={() => void (query.isError ? query.refetch() : all.refetch())}>Retry</Button>
    </> : loading ? <Alert>Loading subscriptions...</Alert> : data && <>
      {data.items.length === 0 ? <Alert>{(checkAll ? all.data?.totalElements : data.totalElements) === 0
        ? 'No subscriptions yet. Add a subscription to get started.' : 'No subscriptions match this filter.'}</Alert>
        : <ul className={styles.list}>{data.items.map(item => <SubscriptionCard key={item.id} item={item}
          action={selection?.id === item.id ? selection.action : undefined} locked={!!selection} pending={mutation.isPending}
          choose={(action, button) => {
            trigger.current = button
            setError('')
            setSelection({ id: item.id, action })
          }}
          dismiss={dismiss} confirm={() => void confirm()} />)}</ul>}
      <nav aria-label="Subscription pages" className={styles.actions}>
        <Button disabled={page === 0 || !!selection} onClick={() => setPage(page - 1)}>Previous</Button>
        <span aria-live="polite">Page {page + 1} of {Math.max(1, data.totalPages)} ({data.totalElements} total)</span>
        <Button disabled={page >= last || !!selection} onClick={() => setPage(page + 1)}>Next</Button>
      </nav>
    </>}
  </section>
}

