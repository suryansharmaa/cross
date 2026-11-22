import type { Category, BillingCycle } from '../api/types'

export const categories: Record<Category, string> = {
  ENTERTAINMENT: 'Entertainment', MUSIC: 'Music', PRODUCTIVITY: 'Productivity',
  CLOUD_AND_AI: 'Cloud & AI', EDUCATION: 'Education', UTILITIES: 'Utilities',
  SHOPPING: 'Shopping', OTHER: 'Other',
}
export const cycles: Record<BillingCycle, string> = { WEEKLY: 'Weekly', MONTHLY: 'Monthly', YEARLY: 'Yearly' }

export const formatINR = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format
const formatter = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeZone: 'UTC' })
export function calendarDate(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(0)
  date.setUTCFullYear(year, month - 1, day)
  return date
}
export const formatCalendarDate = (value: string) => formatter.format(calendarDate(value))

const instantDate = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeZone: 'Asia/Kolkata' })
const instantTime = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' })
export const formatInstantDate = (value: string) => instantDate.format(new Date(value))
export const formatTimestamp = (value: string) => instantTime.format(new Date(value))
