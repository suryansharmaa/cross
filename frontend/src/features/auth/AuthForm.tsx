import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router'
import { ApiError } from '../../api/client'
import type { Credentials, FieldError } from '../../api/types'
import Alert from '../../components/Alert'
import Button from '../../components/Button'
import TextField from '../../components/TextField'
import AuthLayout from './AuthLayout'
import { formErrors, normalizeEmail, validateCredentials } from './validation'
import styles from './Auth.module.css'

export default function AuthForm({ registering, notice, submit }: {
  registering: boolean
  notice?: string
  submit: (credentials: Credentials) => Promise<void>
}) {
  const [values, setValues] = useState({ email: '', password: '', confirmation: '' })
  const [errors, setErrors] = useState<FieldError[]>([])
  const [pending, setPending] = useState(false)
  const submitting = useRef(false)
  const form = useRef<HTMLFormElement>(null)
  const focusError = useRef(false)
  const fields = registering ? ['email', 'password', 'confirmation'] : ['email', 'password']

  useEffect(() => {
    if (!focusError.current) return
    focusError.current = false
    const invalid = form.current?.querySelector<HTMLInputElement>('input[aria-invalid="true"]')
    invalid?.focus()
  }, [errors])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting.current) return
    const email = normalizeEmail(values.email)
    const validation = validateCredentials(email, values.password, registering ? values.confirmation : undefined)
    focusError.current = validation.length > 0
    setErrors(validation)
    if (validation.length) return
    submitting.current = true
    setPending(true)
    try {
      await submit({ email, password: values.password })
    } catch (error) {
      focusError.current = true
      setErrors(error instanceof ApiError && error.code === 'profile_failed'
        ? [{ field: '', message: error.detail }] : formErrors(error, registering))
    } finally {
      submitting.current = false
      setPending(false)
    }
  }

  function field(name: keyof typeof values, label: string, autoComplete: string) {
    return <TextField name={name} label={label} type={name === 'email' ? 'email' : 'password'}
      autoComplete={autoComplete} value={values[name]}
      onChange={event => {
        const value = event.target.value
        setValues(previous => ({ ...previous, [name]: value }))
        setErrors(previous => previous.some(error => error.field === name)
          ? previous.filter(error => error.field !== name) : previous)
      }}
      errors={errors.filter(error => error.field === name).map(error => error.message)} />
  }

  const action = registering ? 'Create an account' : 'Log in'
  const progress = registering ? 'Creating account...' : 'Logging in...'
  const unmatched = errors.filter(error => !fields.includes(error.field))

  return <AuthLayout title={action}>
    {notice && <Alert>{notice}</Alert>}
    <form ref={form} className={styles.form} noValidate onSubmit={handleSubmit}>
      {unmatched.length > 0 && <Alert error>{unmatched.map(({ message }, index) => <div key={index}>{message}</div>)}</Alert>}
      {field('email', 'Email', 'email')}
      {field('password', 'Password', registering ? 'new-password' : 'current-password')}
      {registering && field('confirmation', 'Confirm password', 'new-password')}
      <Button type="submit" disabled={pending}>{pending ? progress : action}</Button>
      <span className={styles.visuallyHidden} role="status">{pending ? progress : ''}</span>
    </form>
    <p>{registering ? <Link to="/login">Log in</Link> : <Link to="/register">Create an account</Link>}</p>
  </AuthLayout>
}
