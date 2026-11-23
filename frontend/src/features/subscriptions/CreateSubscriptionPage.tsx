import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router'
import { createSubscription } from '../../api/subscriptions'
import SubscriptionForm from './SubscriptionForm'
import SubscriptionFormHeader from './SubscriptionFormHeader'
import { refreshSubscriptionViews } from './queries'
import { sessionGuard, useAccount } from '../auth/account'
import styles from './Subscriptions.module.css'

export default function CreateSubscriptionPage() {
  const account = useAccount()
  const cache = useQueryClient()
  const navigate = useNavigate()
  const mutation = useMutation({ mutationFn: createSubscription, retry: false })
  return <section className={styles.page}>
    <SubscriptionFormHeader title="Add subscription" subtitle="Enter the plan details and billing dates you want Cross to track." />
    <SubscriptionForm save={async body => {
      const current = sessionGuard()
      await mutation.mutateAsync(body)
      if (!current()) return
      refreshSubscriptionViews(cache, account)
      void navigate('/subscriptions', { replace: true, state: { notice: 'Subscription added.' } })
    }} />
  </section>
}

