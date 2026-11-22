import type { ComponentProps } from 'react'
import FieldErrors from './FieldErrors'
import styles from './Controls.module.css'

export default function TextAreaField({ name, label, errors, ...props }:
  ComponentProps<'textarea'> & { name: string; label: string; errors: string[] }) {
  return <div className={styles.field}>
    <label htmlFor={name}>{label}</label>
    <textarea {...props} id={name} name={name} aria-invalid={errors.length > 0}
      aria-describedby={errors.length ? name + '-errors' : undefined} />
    <FieldErrors name={name} errors={errors} />
  </div>
}
