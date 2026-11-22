import { describe, expect, it } from 'vitest'
import { formatCalendarDate, formatINR } from '../../lib/subscriptionFormatting'
import { emptyDraft, validate } from './validation'

const valid = { ...emptyDraft, name: ' Plan ', category: 'OTHER', billingCycle: 'MONTHLY', amount: '9999999.99', startDate: '2029-02-28' }
const now = new Date('2024-02-28T19:00:00Z')

describe('subscription formatting and validation', () => {
  it('formats INR and keeps leap-day calendar dates intact', () => {
    expect(formatINR(123456.5)).toBe('\u20b91,23,456.50')
    expect(formatCalendarDate('2024-02-29')).toBe('29 Feb 2024')
  })
  it('checks required fields and Kolkata leap-day bounds', () => {
    expect(validate(emptyDraft, now).errors?.map(error => error.field)).toEqual(['name', 'category', 'billingCycle', 'amount', 'startDate'])
    expect(validate(valid, now).body).toMatchObject({ name: 'Plan', amount: 9999999.99, notes: null })
    for (const startDate of ['1999-12-31', '2029-03-01', '2024-02-30'])
      expect(validate({ ...valid, startDate }, now).errors?.[0]?.field).toBe('startDate')
  })
  it.each(['0', '-1', '10000000', '1.001'])('rejects amount %s', amount => {
    expect(validate({ ...valid, amount }, now).errors?.[0]?.field).toBe('amount')
  })
  it('requires a trial end on or after the start and clears it for non-trials', () => {
    for (const trialEndDate of ['', '2029-02-27'])
      expect(validate({ ...valid, isTrial: true, trialEndDate }, now).errors?.[0]?.field).toBe('trialEndDate')
    expect(validate({ ...valid, isTrial: true, trialEndDate: valid.startDate }, now).body?.trialEndDate).toBe(valid.startDate)
    expect(validate({ ...valid, trialEndDate: valid.startDate }, now).body?.trialEndDate).toBeNull()
  })
})
