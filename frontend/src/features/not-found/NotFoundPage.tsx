import { PageTransition } from '../../components/Motion'
import { Link, useLocation, useNavigate } from 'react-router'
import Button from '../../components/Button'
import Wordmark from '../../components/Wordmark'
import actions from '../../styles/Actions.module.css'
import { useAuth } from '../auth/auth-context'
import styles from './NotFound.module.css'

const privateLinks = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/subscriptions', label: 'Subscriptions' },
  { to: '/notifications', label: 'Notifications' },
  { to: '/account', label: 'Account' },
]
const publicLinks = [
  { to: '/', label: 'Overview' },
  { to: '/login', label: 'Log in' },
  { to: '/register', label: 'Create an account' },
]

export default function NotFoundPage() {
  const { user } = useAuth()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const home = user ? '/dashboard' : '/'

  return <main className={styles.layout}>
    <Wordmark className={styles.wordmark} to={home} />
    <PageTransition className={styles.composition} aria-labelledby="not-found-heading">
      <p className={styles.code}>404</p>
      <h1 id="not-found-heading">Page not found</h1>
      <p className={styles.description}>The page you&rsquo;re looking for doesn&rsquo;t exist or has been moved.</p>
      <code className={styles.path} title={pathname}>{pathname}</code>
      <div className={styles.actions}>
        <Link className={actions.primary + ' ' + styles.returnLink} to={home}>
          {user ? 'Back to dashboard' : 'Back to home'}
        </Link>
        <Button className={actions.secondary + ' ' + styles.back} onClick={() => void navigate(-1)}>Go back</Button>
      </div>
      <footer className={styles.footer}>
        <nav aria-label="Quick links">
          {(user ? privateLinks : publicLinks).map(({ to, label }) => <Link key={to} to={to}>{label}</Link>)}
        </nav>
      </footer>
    </PageTransition>
  </main>
}
