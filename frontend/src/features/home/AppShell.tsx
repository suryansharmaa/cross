import { NavLink, Outlet } from 'react-router'
import Button from '../../components/Button'
import { useAuth } from '../auth/auth-context'
import styles from './Home.module.css'

export default function AppShell() {
  const { user, signOut } = useAuth()
  return <>
    <header className={styles.header}>
      <strong>Cross</strong>
      <nav aria-label="Primary"><NavLink to="/subscriptions">Subscriptions</NavLink></nav>
      <span>{user?.email}</span>
      <Button onClick={signOut}>Logout</Button>
    </header>
    <main className={styles.main}><Outlet /></main>
  </>
}
