import { NavLink, Outlet } from 'react-router'
import Button from '../../components/Button'
import NotificationsLink from '../notifications/NotificationsLink'
import { useAuth } from '../auth/auth-context'
import styles from './Home.module.css'

export default function AppShell() {
  const { signOut } = useAuth()
  return <>
    <header className={styles.header}>
      <strong>Cross</strong>
      <nav className={styles.nav} aria-label="Primary"><NavLink to="/" end>Dashboard</NavLink><NavLink to="/subscriptions">Subscriptions</NavLink></nav>
      <NotificationsLink />
      <NavLink to="/account">Account</NavLink>
      <Button onClick={signOut}>Logout</Button>
    </header>
    <main className={styles.main}><Outlet /></main>
  </>
}

