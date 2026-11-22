import type { FieldError, SubscriptionBody } from '../../api/types'
import { calendarDate, categories, cycles } from '../../lib/subscriptionFormatting'

export interface Draft {
  name: string
  category: string
  amount: string
  billingCycle: string
  startDate: string
  isTrial: boolean
  trialEndDate: string
  notes: string
}

export const emptyDraft: Draft = {
  name: '', category: '', amount: '', billingCycle: '', startDate: '', isTrial: false, trialEndDate: '', notes: '',
}

const kolkata = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Kolkata', year: 'numeric', month: 'numeric', day: 'numeric',
})
function validDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && calendarDate(value).toISOString().slice(0, 10) === value
}

export function validate(draft: Draft, now = new Date()):
  { body: SubscriptionBody; errors?: never } | { errors: FieldError[]; body?: never } {
  const errors: FieldError[] = []
  const add = (field: keyof Draft, message: string) => errors.push({ field, message })
  const name = draft.name.trim()
  const { category, billingCycle, startDate, isTrial, trialEndDate, notes } = draft
  if (!name || name.length > 100) add('name', 'Enter a name of 1 to 100 characters.')
  if (!Object.hasOwn(categories, category)) add('category', 'Choose a category.')
  if (!Object.hasOwn(cycles, billingCycle)) add('billingCycle', 'Choose a billing cycle.')
  const amount = Number(draft.amount)
  if (!/^(?:\d{1,7}(?:\.\d{0,2})?|\.\d{1,2})$/.test(draft.amount) || amount <= 0)
    add('amount', 'Enter an amount from 0.01 through 9,999,999.99 with up to two decimal places.')
  const parts = Object.fromEntries(kolkata.formatToParts(now).map(({ type, value }) => [type, Number(value)]))
  const year = parts.year + 5
  const day = Math.min(parts.day, new Date(Date.UTC(year, parts.month, 0)).getUTCDate())
  const maxDate = calendarDate([year, parts.month, day].join('-')).toISOString().slice(0, 10)
  if (!validDate(startDate) || startDate < '2000-01-01' || startDate > maxDate)
    add('startDate', 'Enter a date from 1 Jan 2000 through five years from today.')
  if (isTrial && (!validDate(trialEndDate) || trialEndDate < startDate))
    add('trialEndDate', 'Enter a trial end date on or after the start date.')
  if (notes.length > 500) add('notes', 'Use at most 500 characters.')
  if (errors.length) return { errors }
  return { body: {
    name, category: category as SubscriptionBody['category'], amount,
    billingCycle: billingCycle as SubscriptionBody['billingCycle'],
    startDate, isTrial, trialEndDate: isTrial ? trialEndDate : null, notes: notes || null,
  } }
}
