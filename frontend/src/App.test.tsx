import { QueryClient } from '@tanstack/react-query'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, it, vi } from 'vitest'
import App from './App'
import { currentUserKey } from './api/users'
import { readSession, storeSession } from './features/auth/session'

const account = { id: 'id', email: 'person@example.test', createdAt: '2026-01-01T00:00:00Z' }
const session = { accessToken: 'example-token', expiresAt: '2099-01-01T00:00:00Z' }
const fetchMock = vi.fn<typeof fetch>()
const expired = 'Your session expired. Please log in again.'
const generic = 'Could not complete your request. Please try again.'
const network = 'Could not reach the server. Please try again.'
const profileError = 'Could not load your account. Please try again.'

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
  vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8080')
})

function mount(path: string) {
  window.history.replaceState(null, '', path)
  const client = new QueryClient()
  return { client, ...render(<App client={client} />) }
}

function problem(status: number, code: string, fieldErrors?: { field: string; message: string }[]) {
  return Response.json({ code, detail: 'Server detail', fieldErrors }, {
    status, headers: { 'Content-Type': 'application/problem+json' },
  })
}

function deferResponse() {
  let finish: (response: Response) => void = () => {}
  const response = new Promise<Response>(resolve => { finish = resolve })
  fetchMock.mockReturnValueOnce(response)
  return finish
}

function fill(registering = false, password = ' password ') {
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'PERSON@EXAMPLE.TEST' } })
  fireEvent.change(screen.getByLabelText('Password', { exact: true }), { target: { value: password } })
  if (registering) fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: password } })
}

function submit(name: string) {
  fireEvent.click(screen.getByRole('button', { name }))
}

it('redirects anonymous Home access and renders the public 404', async () => {
  const home = mount('/')
  expect(await screen.findByRole('heading', { name: 'Log in' })).toBeVisible()
  expect(fetchMock).not.toHaveBeenCalled()
  home.unmount()
  mount('/unknown')
  expect(screen.getByRole('heading', { name: 'Page not found' })).toBeVisible()
  expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/')
})

it('redirects expired Home access and announces expiry', async () => {
  sessionStorage.setItem('cross.session', JSON.stringify({ ...session, expiresAt: '2000-01-01T00:00:00Z' }))
  expect(mount('/').container).toBeDefined()
  expect(await screen.findByText(expired)).toHaveAttribute('role', 'status')
  expect(fetchMock).not.toHaveBeenCalled()
  expect(sessionStorage.length).toBe(0)
})

it.each(['/login', '/register', '/'])('restores a session from storage at %s before displaying Home', async path => {
  storeSession(session)
  const resolve = deferResponse()
  mount(path)
  expect(screen.getByRole('status')).toHaveTextContent('Loading your account...')
  expect(screen.queryByText(account.email)).not.toBeInTheDocument()
  resolve(Response.json(account))
  expect(await screen.findByText(account.email)).toBeVisible()
  expect(await screen.findByRole('heading', { name: 'Subscriptions' })).toBeVisible()
  expect(window.location.pathname).toBe('/subscriptions')
})

it('clears an unauthorized restored session and its query', async () => {
  storeSession(session)
  fetchMock.mockResolvedValueOnce(new Response('Unauthorized', { status: 401 }))
  const { client } = mount('/')
  expect(await screen.findByText(expired)).toHaveAttribute('role', 'status')
  expect(fetchMock).toHaveBeenCalledTimes(1)
  expect(sessionStorage.length).toBe(0)
  expect(client.getQueryState(currentUserKey)).toBeUndefined()
})

it('keeps the stored session and retries restoration only on request', async () => {
  storeSession(session)
  fetchMock.mockRejectedValueOnce(new TypeError('offline')).mockResolvedValueOnce(Response.json(account))
  mount('/')
  expect(await screen.findByRole('alert')).toHaveTextContent(profileError)
  expect(readSession().session).toEqual(session)
  expect(fetchMock).toHaveBeenCalledTimes(1)
  submit('Retry')
  expect(await screen.findByText(account.email)).toBeVisible()
})

it('ends an open session at the timer deadline', async () => {
  const expiresAt = new Date(Date.now() + 60_000).toISOString()
  storeSession({ ...session, expiresAt })
  fetchMock.mockResolvedValueOnce(Response.json(account))
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] })
  mount('/')
  await act(async () => { await vi.advanceTimersByTimeAsync(100) })
  expect(screen.getByText(account.email)).toBeVisible()
  await act(async () => { await vi.advanceTimersByTimeAsync(59_900) })
  expect(screen.getByText(expired)).toBeVisible()
  expect(sessionStorage.length).toBe(0)
})

it.each([['/register', 'Create an account'], ['/login', 'Log in']])(
  'renders and validates accessible forms at %s with keyboard submission', async (path, title) => {
    mount(path)
    const keyboard = userEvent.setup()
    const email = screen.getByLabelText('Email')
    const password = screen.getByLabelText('Password', { exact: true })
    expect(screen.getByRole('heading', { name: title })).toBeVisible()
    await keyboard.tab()
    expect(email).toHaveFocus()
    await keyboard.tab()
    expect(password).toHaveFocus()
    if (path === '/register') {
      await keyboard.tab()
      expect(screen.getByLabelText('Confirm password')).toHaveFocus()
    }
    await keyboard.tab()
    expect(screen.getByRole('button', { name: title })).toHaveFocus()
    await keyboard.keyboard('{Enter}')
    expect(email).toHaveFocus()
    expect(email).toHaveAttribute('aria-invalid', 'true')
    expect(email).toHaveAccessibleDescription('Enter your email address.')
    expect(screen.getByText('Enter your email address.', { selector: '[aria-live] > div' })).toBeVisible()
    expect(password).toHaveAccessibleDescription('Enter your password.')
    if (path === '/register') expect(screen.getByLabelText('Confirm password')).toHaveAccessibleDescription('Confirm your password.')
    expect(fetchMock).not.toHaveBeenCalled()
    fill(path === '/register')
    fireEvent.change(email, { target: { value: 'a@@b' } })
    if (path === '/register') fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'different' } })
    submit(title)
    expect(email).toHaveAccessibleDescription('Enter a valid email address.')
    if (path === '/register') expect(screen.getByLabelText('Confirm password')).toHaveAccessibleDescription('Passwords do not match.')
    expect(fetchMock).not.toHaveBeenCalled()
  },
)

it.each([['/register', 'Create an account'], ['/login', 'Log in']])(
  'renders field and unmatched errors at %s and clears the edited field', async (path, title) => {
    fetchMock.mockResolvedValueOnce(problem(400, 'validation_failed', [
      { field: 'email', message: 'Server email' },
      { field: 'email', message: 'Second email error' },
      { field: 'password', message: 'Server password' },
      { field: 'unknown', message: 'Unmatched field' },
    ]))
    mount(path)
    fill(path === '/register')
    submit(title)
    expect(await screen.findByRole('alert')).toHaveTextContent('Unmatched field')
    const email = screen.getByLabelText('Email')
    expect(email).toHaveFocus()
    expect(email).toHaveAccessibleDescription('Server email Second email error')
    expect(screen.getByLabelText('Password', { exact: true })).toHaveAccessibleDescription('Server password')
    fireEvent.change(email, { target: { value: 'a@b' } })
    expect(email).not.toHaveAccessibleDescription()
    expect(screen.getByText('Server password')).toBeVisible()
  },
)

it('shows duplicate email inline', async () => {
  fetchMock.mockResolvedValueOnce(problem(409, 'duplicate_email'))
  mount('/register')
  fill(true)
  submit('Create an account')
  expect(await screen.findByText('Email is already registered.')).toBeVisible()
  expect(screen.getByLabelText('Email')).toHaveAccessibleDescription('Email is already registered.')
})

it.each([['/register', 'Create an account'], ['/login', 'Log in']])(
  'shows network and generic failures and permits a retry at %s', async (path, title) => {
    fetchMock.mockRejectedValueOnce(new TypeError('offline')).mockResolvedValueOnce(problem(403, 'access_denied'))
    mount(path)
    fill(path === '/register')
    submit(title)
    expect(await screen.findByRole('alert')).toHaveTextContent(network)
    expect(screen.getByRole('button', { name: title })).toBeEnabled()
    submit(title)
    expect(await screen.findByText(generic)).toBeVisible()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  },
)

it('prevents duplicate registration and replaces the route after a successful registration', async () => {
  const resolve = deferResponse()
  mount('/register')
  const historyLength = window.history.length
  fill(true)
  submit('Create an account')
  const button = screen.getByRole('button', { name: 'Creating account...' })
  expect(button).toBeDisabled()
  expect(screen.getByRole('status')).toHaveTextContent('Creating account...')
  if (button.closest('form')) fireEvent.submit(button.closest('form') ?? button)
  expect(fetchMock).toHaveBeenCalledTimes(1)
  expect(fetchMock.mock.calls[0]?.[1]?.body).toBe(JSON.stringify({ email: account.email, password: ' password ' }))
  resolve(Response.json(account, { status: 201 }))
  expect(await screen.findByText('Account created. Log in to continue.')).toHaveAttribute('role', 'status')
  expect(window.location.pathname).toBe('/login')
  expect(window.history.length).toBe(historyLength)
  expect(sessionStorage.length).toBe(0)
})

it.each(['unknown email', 'wrong password'])('shows one generic credential error for %s', async () => {
  fetchMock.mockResolvedValueOnce(problem(401, 'invalid_credentials'))
  mount('/login')
  fill()
  submit('Log in')
  expect(await screen.findByRole('alert')).toHaveTextContent('Email or password is incorrect.')
  expect(window.location.pathname).toBe('/login')
  expect(fetchMock).toHaveBeenCalledTimes(1)
})

it('stores the session before profile fetch, keeps login pending, and restores after reload', async () => {
  fetchMock.mockResolvedValueOnce(Response.json(session))
  const resolve = deferResponse()
  const first = mount('/login')
  fill()
  submit('Log in')
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
  expect(readSession().session).toEqual(session)
  expect(new Headers(fetchMock.mock.calls[1]?.[1]?.headers).get('Authorization')).toBe('Bearer example-token')
  const button = screen.getByRole('button', { name: 'Logging in...' })
  expect(button).toBeDisabled()
  expect(screen.getByRole('status')).toHaveTextContent('Logging in...')
  fireEvent.submit(button.closest('form') ?? button)
  expect(fetchMock).toHaveBeenCalledTimes(2)
  expect(screen.queryByText(account.email)).not.toBeInTheDocument()
  resolve(Response.json(account))
  expect(await screen.findByText(account.email)).toBeVisible()
  expect(window.location.pathname).toBe('/subscriptions')
  first.unmount()
  fetchMock.mockResolvedValueOnce(Response.json(account))
  mount('/')
  expect(await screen.findByText(account.email)).toBeVisible()
  expect(fetchMock).toHaveBeenCalledTimes(3)
})

it.each([401, 403, 0])('cleans up a provisional session after profile failure %s', async status => {
  fetchMock.mockResolvedValueOnce(Response.json(session))
  if (status) fetchMock.mockResolvedValueOnce(new Response(null, { status }))
  else fetchMock.mockRejectedValueOnce(new TypeError('offline'))
  mount('/login')
  fill()
  submit('Log in')
  expect(await screen.findByText(status === 401 ? expired : profileError)).toBeVisible()
  expect(window.location.pathname).toBe('/login')
  expect(sessionStorage.length).toBe(0)
  expect(fetchMock).toHaveBeenCalledTimes(2)
})

it('replaces Home on logout, clears the profile, and guards older Home history', async () => {
  storeSession(session)
  fetchMock.mockResolvedValueOnce(Response.json(account))
  const { client } = mount('/')
  window.history.pushState(null, '', '/')
  const length = window.history.length
  await screen.findByText(account.email)
  expect(client.getQueryData(currentUserKey)).toEqual(account)
  submit('Logout')
  expect(await screen.findByRole('heading', { name: 'Log in' })).toBeVisible()
  expect(window.history.length).toBe(length)
  expect(window.location.pathname).toBe('/login')
  expect(sessionStorage.length).toBe(0)
  expect(client.getQueryState(currentUserKey)).toBeUndefined()
  const back = new Promise<void>(resolve => {
    window.addEventListener('popstate', () => resolve(), { once: true })
  })
  await act(async () => { window.history.back(); await back })
  expect(window.location.pathname).toBe('/login')
  expect(screen.queryByText(account.email)).not.toBeInTheDocument()
  expect(fetchMock).toHaveBeenCalledTimes(1)
})

