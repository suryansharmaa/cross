import { rejectSession, readSession } from '../features/auth/session'
import type { FieldError } from './types'

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly detail: string
  readonly fieldErrors: FieldError[]

  constructor(
    status: number,
    code: string,
    detail: string,
    fieldErrors: FieldError[] = [],
  ) {
    super(detail)
    this.status = status
    this.code = code
    this.detail = detail
    this.fieldErrors = fieldErrors
    this.name = 'ApiError'
  }
}

function isFieldError(value: unknown): value is FieldError {
  return typeof value === 'object' && value !== null &&
    'field' in value && typeof value.field === 'string' &&
    'message' in value && typeof value.message === 'string'
}

async function parseError(response: Response) {
  const mediaType = response.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase()
  if (mediaType === 'application/problem+json') {
    try {
      const body = await response.json()
      if (typeof body?.code === 'string' && typeof body.detail === 'string') {
        return new ApiError(response.status, body.code, body.detail,
          Array.isArray(body.fieldErrors) ? body.fieldErrors.filter(isFieldError) : [])
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') throw error
    }
  }
  return new ApiError(response.status, 'request_failed', 'Could not complete your request. Please try again.')
}

export async function request<T>(path: string, options: {
  body?: object
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  authenticated?: boolean
  signal?: AbortSignal
} = {}): Promise<T> {
  const headers = new Headers()
  if (options.body) headers.set('Content-Type', 'application/json')
  const session = options.authenticated ? readSession().session : null
  if (options.authenticated) {
    if (!session) throw new ApiError(401, 'session_expired', 'Your session expired. Please log in again.')
    headers.set('Authorization', `Bearer ${session.accessToken}`)
  }
  let response: Response
  try {
    response = await fetch(`${import.meta.env.VITE_API_BASE_URL.replace(/\/$/, '')}${path}`, {
      method: options.method ?? (options.body ? 'POST' : 'GET'),
      headers,
      body: options.body && JSON.stringify(options.body),
      signal: options.signal,
    })
  } catch (error) {
    if (options.signal?.aborted || (error instanceof DOMException && error.name === 'AbortError')) throw error
    throw new ApiError(0, 'network_error', 'Could not reach the server. Please try again.')
  }
  if (!response.ok) {
    if (response.status === 401 && session) rejectSession(session)
    throw await parseError(response)
  }
  if (response.status === 204) return undefined as T
  return response.json()
}
