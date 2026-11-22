import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router'
import { ApiError } from '../../api/client'
import { updateSubscription } from '../../api/subscriptions'
import type { SubscriptionBody } from '../../api/types'
import Alert from '../../components/Alert'
import Button from '../../components/Button'
import SubscriptionForm from './SubscriptionForm'
import { detailQuery, sessionGuard, subscriptionsKey, useAccount } from './queries'
import styles from './Subscriptions.module.css'

export default function EditSubscriptionPage() {
  const { id = '' } = useParams()
  const account = useAccount()
  return <EditSubscription key={id} id={id} account={account} />
}

function EditSubscription({ id, account }: { id: string; account: string }) {
  const cache = useQueryClient()
  const navigate = useNavigate()
  const options = detailQuery(account, id)
  const query = useQuery(options)
  const [blocked, setBlocked] = useState<'missing' | 'cancelled'>()
  const [revision, setRevision] = useState(0)
  const mutation = useMutation({ mutationFn: (body: SubscriptionBody) => updateSubscription(id, body), retry: false })
  const data = query.data
  const missing = blocked === 'missing' || (query.error instanceof ApiError && query.error.status === 404)
  const cancelled = blocked === 'cancelled' || data?.status === 'CANCELLED'
  const back = <Link to="/subscriptions">Back to subscriptions</Link>

  async function save(body: SubscriptionBody) {
    const current = sessionGuard()
    try {
      const saved = await mutation.mutateAsync(body)
      if (!current()) return
      cache.setQueryData(options.queryKey, saved)
      void cache.invalidateQueries({ queryKey: subscriptionsKey(account) })
      void navigate('/subscriptions', { replace: true, state: { notice: 'Subscription updated.' } })
    } catch (error) {
      if (!current()) return
      if (error instanceof ApiError && (error.status === 404 || error.code === 'subscription_cancelled')) {
        setBlocked(error.status === 404 ? 'missing' : 'cancelled')
        void cache.invalidateQueries({ queryKey: subscriptionsKey(account) })
        return
      }
      throw error
    }
  }
  return <section className={styles.page}>
    <h1>{missing ? 'Subscription not found' : cancelled ? 'Cancelled subscription' : 'Edit subscription'}</h1>
    {missing || cancelled ? <>
      <Alert>{missing ? 'This subscription is unavailable.' : 'Cancelled subscriptions are read-only.'}</Alert>{back}
    </> : query.isPending ? <Alert>Loading subscription...</Alert> : data ? <SubscriptionForm key={revision}
      initial={{ ...data, amount: String(data.amount), trialEndDate: data.trialEndDate ?? '', notes: data.notes ?? '' }}
      save={save} reload={async () => {
        const result = await query.refetch()
        if (result.error) throw result.error
        setRevision(current => current + 1)
      }} /> : <>
      <Alert error>Could not load the subscription.</Alert>
      <Button onClick={() => void query.refetch()} disabled={query.isFetching}>Retry</Button>{back}
    </>}
  </section>
}
