import type { ComponentProps } from 'react'
import styles from './Controls.module.css'

export default function Button({ type = 'button', ...props }: ComponentProps<'button'>) {
  return <button type={type} className={styles.button} {...props} />
}
