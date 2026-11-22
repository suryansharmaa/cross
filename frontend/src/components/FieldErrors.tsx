import styles from './Controls.module.css'

export default function FieldErrors({ name, errors }: { name: string; errors: string[] }) {
  return <div id={name + '-errors'} className={styles.error} aria-live="polite">
    {errors.map((message, index) => <div key={index}>{message}</div>)}
  </div>
}
