import type { ReactNode } from 'react'
import styles from './Auth.module.css'

export default function AuthLayout({ title, children }: { title: string; children: ReactNode }) {
  return <main className={styles.layout}>
    <section className={styles.card} aria-labelledby="auth-title">
      <h1 id="auth-title">{title}</h1>
      {children}
    </section>
  </main>
}
