import { expect, it } from 'vitest'
import { normalizeEmail, validateCredentials } from './validation'

it('trims and lowercases email', () => {
  expect(normalizeEmail('  A@B  ')).toBe('a@b')
})
it.each(['a@b', 'a+b@localhost', 'a'.repeat(252) + '@b'])('allows simple email %s', email => {
  expect(validateCredentials(email, 'password')).toEqual([])
})
it.each(['a b@c', 'a@b c', 'a@@b', 'a', '@b', 'a@'])('rejects malformed email %s', email => {
  expect(validateCredentials(email, 'password')).toEqual([{ field: 'email', message: 'Enter a valid email address.' }])
})
it('rejects 255-character email', () => {
  expect(validateCredentials('a'.repeat(253) + '@b', 'password')[0]?.message).toBe('Email must be 254 characters or fewer.')
})
it.each(['p'.repeat(8), 'p'.repeat(72), 'é'.repeat(36), '😀'.repeat(18)])('allows boundary password %s', password => {
  expect(validateCredentials('a@b', password)).toEqual([])
})
it.each([
  ['p'.repeat(7), 'Password must be 8 to 72 characters.'],
  ['p'.repeat(73), 'Password must be 8 to 72 characters.'],
  ['é'.repeat(36) + 'a', 'Password must be 72 UTF-8 bytes or fewer.'],
  ['😀'.repeat(19), 'Password must be 72 UTF-8 bytes or fewer.'],
  [' '.repeat(8), 'Enter your password.'],
])('validates password %s', (password, message) => {
  expect(validateCredentials('a@b', password)).toEqual([{ field: 'password', message }])
})
