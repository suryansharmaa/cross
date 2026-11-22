import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router'
import { ApiError } from '../../api/client'
import type { FieldError, SubscriptionBody } from '../../api/types'
import Alert from '../../components/Alert'
import Button from '../../components/Button'
import FieldErrors from '../../components/FieldErrors'
import SelectField from '../../components/SelectField'
import TextAreaField from '../../components/TextAreaField'
import TextField from '../../components/TextField'
import { categories, cycles } from '../../lib/subscriptionFormatting'
import { emptyDraft, validate } from './validation'
import type { Draft } from './validation'
import styles from './Subscriptions.module.css'

export default function SubscriptionForm({ initial = emptyDraft, save, reload }: {
  initial?: Draft
  save: (body: SubscriptionBody) => Promise<void>
  reload?: () => Promise<void>
}) {
  const [draft, setDraft] = useState(initial)
  const [errors, setErrors] = useState<FieldError[]>([])
  const [pending, setPending] = useState(false)
  const [conflict, setConflict] = useState(false)
  const busy = useRef(false)
  const form = useRef<HTMLFormElement>(null)
  const focusError = useRef(false)

  useEffect(() => {
    if (!focusError.current) return
    focusError.current = false
    form.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
  }, [errors])

  function change<K extends keyof Draft>(field: K, value: Draft[K]) {
    const clearTrial = field === 'isTrial' && value === false
    setDraft(previous => ({ ...previous, [field]: value, ...(clearTrial ? { trialEndDate: '' } : {}) }))
    setErrors(previous => previous.filter(error => error.field !== field && !(clearTrial && error.field === 'trialEndDate')))
  }

  async function run(action: () => Promise<void>) {
    if (busy.current) return
    busy.current = true
    setPending(true)
    setErrors([])
    try {
      await action()
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) return
      focusError.current = true
      const code = error instanceof ApiError ? error.code : ''
      if (code === 'optimistic_lock_conflict' && reload) setConflict(true)
      setErrors(error instanceof ApiError && code === 'validation_failed' && error.fieldErrors.length
        ? error.fieldErrors : [{ field: '', message: code === 'subscription_limit_exceeded'
          ? 'You have reached the limit of 100 subscriptions, including cancelled subscriptions.'
          : code === 'optimistic_lock_conflict' ? 'This subscription changed. Reload it to use the latest values.'
          : error instanceof ApiError ? error.detail : 'Could not complete the request.' }])
    } finally {
      busy.current = false
      setPending(false)
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy.current || conflict) return
    const result = validate(draft)
    if (result.errors) {
      focusError.current = true
      setErrors(result.errors)
      return
    }
    const body = result.body
    void run(() => save(body))
  }

  const visibleFields = Object.keys(draft).filter(field => draft.isTrial || field !== 'trialEndDate')
  const unmatched = errors.filter(error => !visibleFields.includes(error.field))
  const messages = (field: string) => errors.filter(error => error.field === field).map(error => error.message)
  function field(name: 'name' | 'amount' | 'startDate' | 'trialEndDate', label: string, type: 'text' | 'date') {
    return <TextField name={name} label={label} type={type} value={draft[name]} errors={messages(name)}
      inputMode={name === 'amount' ? 'decimal' : undefined} onChange={event => change(name, event.target.value)} />
  }
  function select(name: 'category' | 'billingCycle', label: string, options: Record<string, string>) {
    return <SelectField name={name} label={label} required value={draft[name]} errors={messages(name)}
      onChange={event => change(name, event.target.value)}>
      <option value="">Choose an option</option>
      {Object.entries(options).map(([value, text]) => <option key={value} value={value}>{text}</option>)}
    </SelectField>
  }
  return <form ref={form} onSubmit={submit} noValidate className={styles.form}>
    {unmatched.length > 0 && <Alert error>{unmatched.map(({ message }, index) => <p key={index}>{message}</p>)}</Alert>}
    {field('name', 'Name', 'text')}
    {select('category', 'Category', categories)}
    {field('amount', 'Amount (INR)', 'text')}
    {select('billingCycle', 'Billing cycle', cycles)}
    {field('startDate', 'Start date', 'date')}
    <div>
      <label><input type="checkbox" name="isTrial" checked={draft.isTrial}
        aria-invalid={messages('isTrial').length > 0} aria-describedby="isTrial-errors"
        onChange={event => change('isTrial', event.target.checked)} /> Trial</label>
      <FieldErrors name="isTrial" errors={messages('isTrial')} />
    </div>
    {draft.isTrial && field('trialEndDate', 'Trial end date', 'date')}
    <TextAreaField name="notes" label="Notes (optional)" rows={4} value={draft.notes} errors={messages('notes')}
      onChange={event => change('notes', event.target.value)} />
    <div className={styles.actions}>
      <Button type="submit" disabled={pending || conflict}>Save subscription</Button>
      {conflict && reload && <Button disabled={pending} onClick={() => void run(reload)}>Reload subscription</Button>}
      <Link to="/subscriptions">Back to subscriptions</Link>
    </div>
    {pending && <Alert>{conflict ? 'Reloading subscription...' : 'Saving subscription...'}</Alert>}
  </form>
}
