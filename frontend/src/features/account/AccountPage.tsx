import { useEffect, useRef, useState } from 'react'
import { Calendar, Mail } from 'lucide-react'
import { useMutation } from '@tanstack/react-query'
import { ApiError } from '../../api/client'
import { deleteAccount } from '../../api/users'
import Alert from '../../components/Alert'
import { TactileButton } from '../../components/Motion'
import Button from '../../components/Button'
import { formatInstantDate } from '../../lib/subscriptionFormatting'
import { sessionGuard } from '../auth/account'
import { useAuth } from '../auth/auth-context'
import styles from './Account.module.css'

export default function AccountPage() {
  const { user, accountDeleted } = useAuth()
  const [confirming, setConfirming] = useState(false)
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const trigger = useRef<HTMLButtonElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const busy = useRef(false)
  useEffect(() => { if (confirming) input.current?.focus() }, [confirming])
  const mutation = useMutation({ mutationFn: deleteAccount, retry: false })
  if (!user) return null
  const matches = email.trim() === user.email

  async function removeAccount() {
    if (!matches || busy.current) return
    busy.current = true
    const current = sessionGuard()
    setError('')
    try {
      await mutation.mutateAsync()
      if (current()) accountDeleted()
    } catch (failure) {
      if (current()) setError(failure instanceof ApiError ? failure.detail : 'Could not delete your account.')
    } finally {
      busy.current = false
    }
  }

  return <section aria-labelledby="account-heading">
    <header className={styles.pageHeader}>
      <h1 id="account-heading">Account</h1>
      <p>Manage your profile details and account data.</p>
    </header>
    <section className={styles.profile} aria-labelledby="account-profile-heading">
      <h2 id="account-profile-heading">Profile</h2>
      <dl className={styles.details}>
        <div>
          <dt><span className={styles.icon}><Mail size={16} aria-hidden="true" /></span>Email</dt><dd>{user.email}</dd>
        </div>
        <div>
          <dt><span className={styles.icon}><Calendar size={16} aria-hidden="true" /></span>Account created</dt>
          <dd><time dateTime={user.createdAt}>{formatInstantDate(user.createdAt)}</time></dd>
        </div>
      </dl>
    </section>
    <section className={styles.danger} aria-labelledby="delete-account-heading">
      <div className={styles.dangerHeader}>
        <div>
          <h2 id="delete-account-heading">Delete account</h2>
          <p>Deleting your account permanently removes your account, all subscriptions, and all notifications.</p>
        </div>
        <TactileButton className={styles.deleteTrigger} ref={trigger} hidden={confirming}
          onClick={() => setConfirming(true)}>Delete account</TactileButton>
      </div>
      {confirming && <form className={styles.form} onSubmit={event => { event.preventDefault(); void removeAccount() }}>
        <label htmlFor="delete-account-email">Type your email to confirm</label>
        <input id="delete-account-email" type="text" inputMode="email" required ref={input}
          autoComplete="off" value={email} onChange={event => setEmail(event.target.value)} disabled={mutation.isPending} />
        {error && <Alert error>{error}</Alert>}
        {mutation.isPending && <Alert>Deleting your account...</Alert>}
        <div className={styles.actions}>
          <TactileButton className={styles.deleteSubmit} type="submit" disabled={!matches || mutation.isPending}>Permanently delete account</TactileButton>
          <Button className={styles.cancel} disabled={mutation.isPending} onClick={() => {
            setConfirming(false)
            setEmail('')
            setError('')
            requestAnimationFrame(() => trigger.current?.focus())
          }}>Cancel</Button>
        </div>
      </form>}
    </section>
  </section>
}

