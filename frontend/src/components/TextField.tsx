import type { ChangeEventHandler } from 'react'
import FieldErrors from './FieldErrors'
import styles from './Controls.module.css'

export default function TextField({ name, label, type, autoComplete, inputMode, value, onChange, errors }: {
  name: string
  label: string
  type: 'email' | 'password' | 'text' | 'date'
  autoComplete?: string
  inputMode?: 'decimal'
  value: string
  onChange: ChangeEventHandler<HTMLInputElement>
  errors: string[]
}) {
  const errorId = `${name}-errors`
  return <div className={styles.field}>
    <label htmlFor={name}>{label}</label>
    <input id={name} name={name} type={type} autoComplete={autoComplete} inputMode={inputMode} required
      value={value} onChange={onChange} aria-invalid={errors.length > 0}
      aria-describedby={errors.length ? errorId : undefined} />
    <FieldErrors name={name} errors={errors} />
  </div>
}
