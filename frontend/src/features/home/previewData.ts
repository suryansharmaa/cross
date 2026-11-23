import type { Category } from '../../api/types'

export const formatPreviewINR = new Intl.NumberFormat('en-IN', {
  style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 0,
}).format

type PreviewSubscription = {
  category: Category
  amount: number
  next: string
  status: string
  tone: 'warning' | 'neutral'
  bar: 'dark' | 'mid' | 'deep' | 'light'
}

export const paidSubscriptions: PreviewSubscription[] = [
  { category: 'ENTERTAINMENT', amount: 799, next: '2026-04-18', status: 'Renews in 3 days', tone: 'warning', bar: 'dark' },
  { category: 'CLOUD_AND_AI', amount: 399, next: '2026-04-24', status: 'Active', tone: 'neutral', bar: 'mid' },
  { category: 'PRODUCTIVITY', amount: 249, next: '2026-04-28', status: 'Active', tone: 'neutral', bar: 'deep' },
  { category: 'MUSIC', amount: 149, next: '2026-05-03', status: 'Active', tone: 'neutral', bar: 'light' },
]

export const monthlyPreviewSpend = paidSubscriptions.reduce((total, subscription) => total + subscription.amount, 0)

export const trialPreview = {
  category: 'EDUCATION', amount: 299, next: '2026-04-16',
  status: 'Trial \u00b7 1 day left', tone: 'urgent',
} as const
