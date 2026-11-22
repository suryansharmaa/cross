import type { ReactNode } from 'react'
import styles from './Controls.module.css'

export default function Alert({ children, error = false }: { children: ReactNode; error?: boolean }) {
  return <div className={error ? styles.error : undefined} role={error ? 'alert' : 'status'}>{children}</div>
}
