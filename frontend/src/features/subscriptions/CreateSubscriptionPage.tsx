import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router'
import { createSubscription } from '../../api/subscriptions'
import SubscriptionForm from './SubscriptionForm'
import { sessionGuard, subscriptionsKey, useAccount } from './queries'
import styles from './Subscriptions.module.css'

export default function CreateSubscriptionPage() {
  const account = useAccount()
  const cache = useQueryClient()
  const navigate = useNavigate()
  const mutation = useMutation({ mutationFn: createSubscription, retry: false })
  return <section className={styles.page}>
    <h1>Add subscription</h1>
    <SubscriptionForm save={async body => {
      const current = sessionGuard()
      await mutation.mutateAsync(body)
      if (!current()) return
      void cache.invalidateQueries({ queryKey: subscriptionsKey(account) })
      void navigate('/subscriptions', { replace: true, state: { notice: 'Subscription added.' } })
    }} />
  </section>
}
