import type { ComponentProps } from 'react'
import styles from '../styles/Actions.module.css'

export default function Button({ type = 'button', ...props }: ComponentProps<'button'>) {
  return <button type={type} className={styles.primary} {...props} />
}
