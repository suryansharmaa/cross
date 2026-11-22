import type { ReactNode } from 'react'
import Button from '../../components/Button'
import { useAuth } from '../auth/auth-context'
import styles from './Home.module.css'

export default function AppShell({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth()
  return <>
    <header className={styles.header}>
      <strong>Cross</strong>
      <span>{user?.email}</span>
      <Button onClick={signOut}>Logout</Button>
    </header>
    <main className={styles.main}>{children}</main>
  </>
}
