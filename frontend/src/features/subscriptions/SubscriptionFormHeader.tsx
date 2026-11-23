import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router'
import styles from './Subscriptions.module.css'

export default function SubscriptionFormHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return <header className={styles.formHeader}>
    <Link className={styles.backLink} to="/subscriptions" aria-label="Back to subscriptions">
      <ArrowLeft size={16} aria-hidden="true" />Subscriptions
    </Link>
    <h1>{title}</h1>
    {subtitle && <p>{subtitle}</p>}
  </header>
}
