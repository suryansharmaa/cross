import { PageTransition } from '../../components/Motion'
import { ArrowLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import styles from './Auth.module.css'

export default function AuthLayout({ title, children, credentials = false }: {
  title: string
  children: ReactNode
  credentials?: boolean
}) {
  return <main className={credentials ? styles.layout + ' ' + styles.credentialLayout : styles.layout}>
    <Link className={styles.back} to="/">{credentials && <ArrowLeft size={15} aria-hidden="true" />}Back to Cross</Link>
    <PageTransition className={styles.card} aria-labelledby="auth-title">
      <h1 id="auth-title">{title}</h1>
      {children}
    </PageTransition>
  </main>
}
