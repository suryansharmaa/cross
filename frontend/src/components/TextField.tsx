import type { ChangeEventHandler } from 'react'
import styles from './Controls.module.css'

export default function TextField({ name, label, type, autoComplete, value, onChange, errors }: {
  name: string
  label: string
  type: 'email' | 'password'
  autoComplete: string
  value: string
  onChange: ChangeEventHandler<HTMLInputElement>
  errors: string[]
}) {
  const errorId = `${name}-errors`
  return <div className={styles.field}>
    <label htmlFor={name}>{label}</label>
    <input id={name} name={name} type={type} autoComplete={autoComplete} required
      value={value} onChange={onChange} aria-invalid={errors.length > 0}
      aria-describedby={errors.length ? errorId : undefined} />
    <div id={errorId} className={styles.error} aria-live="polite">
      {errors.map((message, index) => <div key={index}>{message}</div>)}
    </div>
  </div>
}
