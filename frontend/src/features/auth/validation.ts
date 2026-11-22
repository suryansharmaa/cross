import { ApiError } from '../../api/client'
import type { FieldError } from '../../api/types'

export const normalizeEmail = (value: string) => value.trim().toLowerCase()

export function validateCredentials(email: string, password: string, confirmation?: string): FieldError[] {
  const errors: FieldError[] = []
  if (!email) errors.push({ field: 'email', message: 'Enter your email address.' })
  else if (email.length > 254) errors.push({ field: 'email', message: 'Email must be 254 characters or fewer.' })
  else if (!/^[^@\s]+@[^@\s]+$/.test(email)) errors.push({ field: 'email', message: 'Enter a valid email address.' })
  if (!password.trim()) errors.push({ field: 'password', message: 'Enter your password.' })
  else if (password.length < 8 || password.length > 72) errors.push({ field: 'password', message: 'Password must be 8 to 72 characters.' })
  else if (new TextEncoder().encode(password).length > 72) errors.push({ field: 'password', message: 'Password must be 72 UTF-8 bytes or fewer.' })
  if (confirmation === '') errors.push({ field: 'confirmation', message: 'Confirm your password.' })
  else if (confirmation !== undefined && confirmation !== password) errors.push({ field: 'confirmation', message: 'Passwords do not match.' })
  return errors
}

export function formErrors(error: unknown, registering: boolean): FieldError[] {
  if (error instanceof ApiError) {
    if (error.code === 'validation_failed' && error.fieldErrors.length) return error.fieldErrors
    if (registering && error.code === 'duplicate_email') return [{ field: 'email', message: 'Email is already registered.' }]
    if (!registering && error.status === 401 && error.code === 'invalid_credentials') {
      return [{ field: '', message: 'Email or password is incorrect.' }]
    }
    if (error.code === 'network_error') return [{ field: '', message: error.detail }]
  }
  return [{ field: '', message: 'Could not complete your request. Please try again.' }]
}
