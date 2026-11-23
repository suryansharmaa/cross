import { QueryClient } from '@tanstack/react-query'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
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
  vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) => {
    const path = new URL(String(input)).pathname
    if (path.endsWith('/notifications/unread-count')) return Promise.resolve(Response.json({ count: 0 }))
    if (path.endsWith('/dashboard')) return Promise.resolve(Response.json({
      activeCount: 0, monthlySpend: 0, yearlySpend: 0, categoryBreakdown: [],
      trialsPending: { count: 0, monthlyIfConverted: 0 }, upcomingRenewals: [],
    }))
    return fetchMock(input, init)
  })
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

it.each(['/dashboard', '/notifications', '/account'])('redirects anonymous access at %s', async path => {
  mount(path)
  expect(await screen.findByRole('heading', { name: 'Log in' })).toBeVisible()
  expect(fetchMock).not.toHaveBeenCalled()
})

it('shows the public 404 and links home at an unknown route', async () => {
  mount('/does-not-exist')
  expect(screen.getByText('404')).toBeVisible()
  expect(screen.getByRole('heading', { name: 'Page not found' })).toBeVisible()
  expect(screen.getByRole('link', { name: 'Cross' })).toHaveAttribute('href', '/')
  const home = screen.getByRole('link', { name: 'Back to home' })
  expect(home).toHaveAttribute('href', '/')
  await userEvent.click(home)
  expect(window.location.pathname).toBe('/')
})

it('shows the missing path and returns to the previous route', async () => {
  window.history.replaceState(null, '', '/login')
  window.history.pushState(null, '', '/missing/plan?source=test')
  mount('/missing/plan?source=test')
  expect(screen.getByText('/missing/plan')).toBeVisible()
  await userEvent.click(screen.getByRole('button', { name: 'Go back' }))
  expect(await screen.findByRole('heading', { name: 'Log in' })).toBeVisible()
})

it('links an authenticated visitor from the 404 to the dashboard', async () => {
  storeSession(session)
  fetchMock.mockResolvedValueOnce(Response.json(account))
  mount('/does-not-exist')
  expect(screen.getByRole('heading', { name: 'Page not found' })).toBeVisible()
  const dashboard = await screen.findByRole('link', { name: 'Back to dashboard' })
  expect(dashboard).toHaveAttribute('href', '/dashboard')
  expect(screen.getByRole('link', { name: 'Cross' })).toHaveAttribute('href', '/dashboard')
  await userEvent.click(dashboard)
  expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeVisible()
})

it('redirects expired Home access and announces expiry', async () => {
  sessionStorage.setItem('cross.session', JSON.stringify({ ...session, expiresAt: '2000-01-01T00:00:00Z' }))
  expect(mount('/dashboard').container).toBeDefined()
  expect(await screen.findByText(expired)).toHaveAttribute('role', 'status')
  expect(fetchMock).not.toHaveBeenCalled()
  expect(sessionStorage.length).toBe(0)
})

it.each(['/login', '/register', '/dashboard'])('restores a session from storage at %s before displaying Home', async path => {
  storeSession(session)
  const resolve = deferResponse()
  mount(path)
  expect(screen.getByRole('status')).toHaveTextContent('Loading your account...')
  expect(screen.queryByText(account.email)).not.toBeInTheDocument()
  resolve(Response.json(account))
  expect(await screen.findByRole('link', { name: 'Account' })).toBeVisible()
  expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeVisible()
  expect(window.location.pathname).toBe('/dashboard')
})

it('clears an unauthorized restored session and its query', async () => {
  storeSession(session)
  fetchMock.mockResolvedValueOnce(new Response('Unauthorized', { status: 401 }))
  const { client } = mount('/dashboard')
  expect(await screen.findByText(expired)).toHaveAttribute('role', 'status')
  expect(fetchMock).toHaveBeenCalledTimes(1)
  expect(sessionStorage.length).toBe(0)
  expect(client.getQueryState(currentUserKey)).toBeUndefined()
})

it('keeps the stored session and retries restoration only on request', async () => {
  storeSession(session)
  fetchMock.mockRejectedValueOnce(new TypeError('offline')).mockResolvedValueOnce(Response.json(account))
  mount('/dashboard')
  expect(await screen.findByRole('alert')).toHaveTextContent(profileError)
  expect(readSession().session).toEqual(session)
  expect(fetchMock).toHaveBeenCalledTimes(1)
  submit('Retry')
  expect(await screen.findByRole('link', { name: 'Account' })).toBeVisible()
})

it('ends an open session at the timer deadline', async () => {
  const expiresAt = new Date(Date.now() + 60_000).toISOString()
  storeSession({ ...session, expiresAt })
  fetchMock.mockResolvedValueOnce(Response.json(account))
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] })
  mount('/dashboard')
  await act(async () => { await vi.advanceTimersByTimeAsync(100) })
  expect(screen.getByRole('link', { name: 'Account' })).toBeVisible()
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
    expect(email).toHaveAttribute('placeholder', 'you@example.com')
    expect(password).toHaveAttribute('placeholder', '\u2022'.repeat(8))
    await keyboard.tab()
    expect(screen.getByRole('link', { name: 'Back to Cross' })).toHaveFocus()
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
    await waitFor(() => expect(email).toHaveFocus())
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
  expect(await screen.findByRole('link', { name: 'Account' })).toBeVisible()
  expect(window.location.pathname).toBe('/dashboard')
  first.unmount()
  fetchMock.mockResolvedValueOnce(Response.json(account))
  mount('/dashboard')
  expect(await screen.findByRole('link', { name: 'Account' })).toBeVisible()
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
  const { client } = mount('/dashboard')
  window.history.pushState(null, '', '/')
  const length = window.history.length
  await screen.findByRole('link', { name: 'Account' })
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



it('shows the public landing, feature sections, and guest destinations without fetching', async () => {
  const fetchSpy = vi.spyOn(globalThis, 'fetch')
  try {
    mount('/')
    expect(screen.getByRole('heading', { name: 'Track free trials and subscriptions.' })).toBeVisible()
    expect(screen.getByText(/alerts 3 days and 1 day/)).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Subscription spend, in INR.' })).toBeVisible()
    expect(screen.getAllByRole('link', { name: 'Create an account' })[0]).toHaveAttribute('href', '/register')
    const login = screen.getAllByRole('link', { name: 'Log in' })[0]
    expect(login).toHaveAttribute('href', '/login')
    for (const amount of [799, 399, 299]) {
      expect(screen.getAllByText('\u20B9' + amount)[0]).toBeVisible()
    }
    expect(screen.getByRole('link', { name: 'Get started' })).toHaveAttribute('href', '/register')
    for (const section of ['Overview', 'Reminders', 'Spending', 'Contact']) {
      const id = section.toLowerCase()
      expect(screen.getAllByRole('link', { name: section })[0]).toHaveAttribute('href', '#' + id)
      expect(document.getElementById(id)).toBeVisible()
    }
    expect(screen.getByRole('link', { name: 'LinkedIn' })).toHaveAttribute('href', 'https://www.linkedin.com/in/suryansharmaa')
    expect(screen.getByRole('link', { name: 'suryansharmaa@gmail.com' })).toHaveAttribute('href', 'mailto:suryansharmaa@gmail.com')
    const detail = screen.getByRole('complementary', { name: 'Plan details' })
    expect(within(detail).getByText('Trial ends tomorrow')).toBeVisible()
    const streaming = screen.getByRole('button', { name: /Entertainment/ })
    await userEvent.click(streaming)
    expect(streaming).toHaveAttribute('aria-pressed', 'true')
    expect(within(detail).getByText('3-day reminder')).toBeVisible()
    const backup = screen.getByRole('button', { name: /Education/ })
    backup.focus()
    await userEvent.keyboard('{Enter}')
    expect(backup).toHaveAttribute('aria-pressed', 'true')
    expect(within(detail).getByText('Trial ends tomorrow')).toBeVisible()
    const defaultStep = screen.getByRole('button', { name: 'Make the call' })
    const firstStep = screen.getByRole('button', { name: 'Get a heads-up' })
    expect(defaultStep).toHaveAttribute('aria-pressed', 'true')
    firstStep.focus()
    await userEvent.keyboard('{Enter}')
    expect(firstStep).toHaveAttribute('aria-pressed', 'true')
    expect(defaultStep).toHaveAttribute('aria-pressed', 'false')
    expect(fetchSpy).not.toHaveBeenCalled()
    await userEvent.click(login)
    expect(await screen.findByRole('heading', { name: 'Log in' })).toBeVisible()
  } finally {
    fetchSpy.mockRestore()
  }
})

it('keeps the landing visible during profile restore and offers a dashboard link after retry', async () => {
  storeSession(session)
  const resolve = deferResponse()
  mount('/')
  expect(screen.getAllByText('Loading your account…')[0]).toBeVisible()
  expect(screen.getByRole('heading', { level: 1 })).toBeVisible()
  resolve(problem(500, 'server_error'))
  const retry = (await screen.findAllByRole('button', { name: 'Retry' }))[0]
  fetchMock.mockResolvedValueOnce(Response.json(account))
  await userEvent.click(retry)
  const dashboard = (await screen.findAllByRole('link', { name: 'Open dashboard' }))[0]
  expect(dashboard).toHaveAttribute('href', '/dashboard')
  expect(window.location.pathname).toBe('/')
  await userEvent.click(dashboard)
  expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeVisible()
})
