import { QueryClient } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import App from './App'
import { storeSession, readSession } from './features/auth/session'

const profile = { id: 'owner', email: 'person@example.test', createdAt: '2026-01-01T00:00:00Z' }
const empty = { generatedOn: '2026-02-01', activeCount: 0, monthlySpend: 0, yearlySpend: 0,
  trialsPending: { count: 0, monthlyIfConverted: 0 }, categoryBreakdown: [], upcomingRenewals: [] }

function mount(path: string, handle: (url: URL, init?: RequestInit) => Response | Promise<Response>, unread = () => 0) {
  window.history.replaceState(null, '', path)
  storeSession({ accessToken: 'test-token', expiresAt: '2099-01-01T00:00:00Z' })
  vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8080')
  const fetchMock = vi.fn<typeof fetch>(async (input, init) => {
    const url = new URL(String(input))
    if (url.pathname.endsWith('/users/me') && init?.method !== 'DELETE') return Response.json(profile)
    if (url.pathname.endsWith('/unread-count')) return Response.json({ count: unread() })
    return handle(url, init)
  })
  vi.stubGlobal('fetch', fetchMock)
  const client = new QueryClient()
  render(<App client={client} />)
  return { user: userEvent.setup(), client, fetchMock }
}

it('retries the dashboard and offers an add link for an empty account', async () => {
  let calls = 0
  const { user } = mount('/dashboard', () => ++calls === 1 ? new Response(null, { status: 500 }) : Response.json(empty))
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not load your dashboard')
  await user.click(screen.getByRole('button', { name: 'Retry' }))
  expect(within(screen.getByRole('main')).getByRole('link', { name: 'Add subscription' })).toHaveAttribute('href', '/subscriptions/new')
  expect(within(screen.getByRole('banner', { name: 'Application' })).queryByRole('link', { name: 'Add subscription' })).not.toBeInTheDocument()
  expect(await screen.findByText('No paying spend yet.')).toBeVisible()
  expect(screen.getByRole('link', { name: 'Add a subscription' })).toHaveAttribute('href', '/subscriptions/new')
  expect(screen.getByText('Nothing renews in the next 30 days.')).toBeVisible()
  expect(screen.queryByText(/due within 7 days/)).not.toBeInTheDocument()
})

it('renders dashboard conversion cost and renewal names as text', async () => {
  mount('/dashboard', () => Response.json({ ...empty, activeCount: 2, monthlySpend: 100, yearlySpend: 1200,
    trialsPending: { count: 1, monthlyIfConverted: 123 },
    categoryBreakdown: [{ category: 'MUSIC', count: 1, monthlySpend: 100, yearlySpend: 1200 }],
    upcomingRenewals: [{ id: 'one', name: '<b>Trial</b>', category: 'OTHER', amount: 123,
      billingCycle: 'MONTHLY', isTrial: true, nextBillingDate: '2026-02-02', daysUntil: 1 },
    { id: 'two', name: 'Included', category: 'MUSIC', amount: 77, billingCycle: 'MONTHLY',
      isTrial: false, nextBillingDate: '2026-02-08', daysUntil: 7 },
    { id: 'three', name: 'Next week', category: 'MUSIC', amount: 99, billingCycle: 'MONTHLY',
      isTrial: false, nextBillingDate: '2026-02-09', daysUntil: 8 }],
  }))
  expect(await screen.findByText(/123.00 per month if converted/)).toBeVisible()
  expect(screen.getByRole('link', { name: '<b>Trial</b>' })).toHaveAttribute('href', '/subscriptions/one/edit')
  expect(screen.getByText('Trial', { exact: true })).toBeVisible()
  expect(screen.getByText("Due tomorrow")).toBeVisible()
  expect(screen.getByText('2 Feb 2026')).toHaveAttribute('datetime', '2026-02-02')
  expect(screen.getByText('2 renewals due within 7 days · \u20B9200.00')).toBeVisible()
  const category = within(screen.getByRole('region', { name: 'Category spend' }))
  expect(category.getByText('100% ·', { exact: false })).toBeVisible()
  expect(category.getByText('Top category')).toBeVisible()
})

it('cross-highlights category rows and breakdown segments with motion disabled', async () => {
  mount('/dashboard', () => Response.json({ ...empty, monthlySpend: 100, yearlySpend: 1200,
    categoryBreakdown: [
      { category: 'MUSIC', count: 1, monthlySpend: 25, yearlySpend: 300 },
      { category: 'CLOUD_AND_AI', count: 1, monthlySpend: 75, yearlySpend: 900 },
    ],
  }))
  const card = await screen.findByRole('region', { name: 'Category spend' })
  const [musicRow, cloudRow] = within(card).getAllByRole('listitem')
  const musicSegment = card.querySelector('div[data-category="MUSIC"]')
  const cloudFill = card.querySelector('div[data-category="CLOUD_AND_AI"] > span')
  if (!musicSegment || !cloudFill) throw new Error('Missing category segments')

  fireEvent.pointerEnter(musicSegment)
  expect(musicRow).toHaveAttribute('data-highlighted', 'true')
  fireEvent.pointerLeave(musicSegment.parentElement ?? card)
  expect(musicRow).not.toHaveAttribute('data-highlighted')

  fireEvent.pointerEnter(cloudRow)
  expect(cloudRow).toHaveAttribute('data-highlighted', 'true')
  await waitFor(() => expect(musicSegment.firstElementChild).toHaveStyle({ opacity: '.32' }))
  expect(cloudFill).toHaveStyle({ opacity: '1' })
  fireEvent.pointerLeave(cloudRow)
  await waitFor(() => expect(musicSegment.firstElementChild).toHaveStyle({ opacity: '1' }))
  expect(cloudRow).not.toHaveAttribute('data-highlighted')
})

it('marks single and all notifications read and refreshes the accessible bell count', async () => {
  let count = 2
  const row = { id: 'one', subscriptionId: 'sub', kind: 'TRIAL_ENDING', alertType: 'ONE_DAY',
    message: '<em>Trial ends tomorrow</em>', billingDate: '2026-01-02', createdAt: '2026-01-01T00:00:00Z' }
  const { user } = mount('/notifications', (url, init) => {
    if (init?.method === 'POST') {
      if (url.pathname.endsWith('/read-all')) {
        count = 0
        return Response.json({ updated: 1 })
      }
      count = 1
      return Response.json({ ...row, readAt: row.createdAt })
    }
    const items = url.searchParams.has('unreadOnly') && count < 2 ? [] :
      [{ ...row, readAt: count < 2 ? row.createdAt : null }]
    return Response.json({ items, page: 0, size: 20, totalPages: items.length, totalElements: items.length })
  }, () => count)
  expect(await screen.findByText(row.message)).toBeVisible()
  expect(screen.getByText('1 day before')).toBeVisible()
  expect(await screen.findByRole('link', { name: 'Notifications, 2 unread' })).toHaveTextContent('2')
  await user.click(screen.getByRole('button', { name: 'Mark as read' }))
  expect(await screen.findByText('Read', { exact: true })).toBeVisible()
  expect(await screen.findByRole('link', { name: 'Notifications, 1 unread' })).toBeVisible()
  await user.click(screen.getByRole('button', { name: 'Unread' }))
  expect(await screen.findByText('No unread notifications.')).toBeVisible()
  await user.click(screen.getByRole('button', { name: 'Mark all as read' }))
  expect(await screen.findByRole('link', { name: 'Notifications, 0 unread' })).toHaveTextContent(/^Notifications$/)
})

it('shows the empty notification feed and disables mark all as read', async () => {
  mount('/notifications', () => Response.json({ items: [], page: 0, size: 20, totalPages: 0, totalElements: 0 }))
  expect(await screen.findByText('No notifications yet.')).toBeVisible()
  expect(screen.getByRole('button', { name: 'Mark all as read' })).toBeDisabled()
})

it('requires email confirmation and clears protected caches after deleting the account', async () => {
  let complete: (response: Response) => void = () => {}
  const response = new Promise<Response>(resolve => { complete = resolve })
  const { user, client, fetchMock } = mount('/account', () => response)
  const keys = [['subscriptions', 'owner'], ['dashboard', 'owner'], ['notifications', 'owner', 'list']]
  keys.forEach(key => client.setQueryData(key, {}))
  const inFlight = vi.fn()
  const query = client.fetchQuery({
    queryKey: ['dashboard', 'owner', 'in-flight'],
    queryFn: ({ signal }) => new Promise(resolve => {
      signal.addEventListener('abort', () => { inFlight(); resolve(null) }, { once: true })
    }),
  }).catch(() => undefined)
  expect(await screen.findByText(profile.email)).toBeVisible()
  const open = screen.getByRole('button', { name: 'Delete account' })
  await user.click(open)
  expect(screen.getByLabelText('Type your email to confirm')).toHaveFocus()
  await user.click(screen.getByRole('button', { name: 'Cancel' }))
  await waitFor(() => expect(open).toHaveFocus())
  await user.click(open)
  const confirm = screen.getByRole('button', { name: 'Permanently delete account' })
  expect(confirm).toBeDisabled()
  await user.type(screen.getByLabelText('Type your email to confirm'), profile.email)
  await user.dblClick(confirm)
  expect(confirm).toBeDisabled()
  expect(fetchMock.mock.calls.filter(([, init]) => init?.method === 'DELETE')).toHaveLength(1)
  complete(new Response(null, { status: 204 }))
  expect(await screen.findByText('Your account has been deleted.')).toHaveAttribute('role', 'status')
  expect(window.location.pathname).toBe('/login')
  await query
  expect(inFlight).toHaveBeenCalledOnce()
  expect(readSession().session).toBeNull()
  for (const key of [...keys, ['current-user'], ['notifications', 'owner', 'unread-count']]) {
    expect(client.getQueryState(key)).toBeUndefined()
  }
})

it.each(['/dashboard', '/notifications', '/account'])('uses the common protected 401 redirect from %s', async path => {
  const { user } = mount(path, () => new Response(null, { status: 401 }))
  if (path === '/account') {
    await user.click(await screen.findByRole('button', { name: 'Delete account' }))
    await user.type(screen.getByLabelText('Type your email to confirm'), profile.email)
    await user.click(screen.getByRole('button', { name: 'Permanently delete account' }))
  }
  expect(await screen.findByText('Your session expired. Please log in again.')).toBeVisible()
  expect(readSession().session).toBeNull()
})


it('retries notifications, paginates, and resets the page when switching filters', async () => {
  let calls = 0
  const { user } = mount('/notifications', url => {
    if (++calls === 1) return new Response(null, { status: 500 })
    const page = Number(url.searchParams.get('page'))
    const unread = url.searchParams.has('unreadOnly')
    return Response.json({ items: [], page, size: 20, totalElements: unread ? 0 : 22, totalPages: unread ? 0 : 2 })
  })
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not load notifications')
  await user.click(screen.getByRole('button', { name: 'Retry' }))
  expect(await screen.findByText('No notifications yet.')).toBeVisible()
  expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled()
  await user.click(screen.getByRole('button', { name: 'Next' }))
  expect(await screen.findByText('Page 2 of 2')).toHaveAttribute('aria-live', 'polite')
  expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled()
  await user.click(screen.getByRole('button', { name: 'Unread' }))
  expect(await screen.findByText('No unread notifications.')).toBeVisible()
  expect(screen.getByText('Page 1 of 1')).toBeVisible()
})

it('retains email confirmation and allows retry after a recoverable delete failure', async () => {
  let calls = 0
  const { user } = mount('/account', () => ++calls === 1
    ? Response.json({ code: 'internal_error', detail: 'Try again later.' }, {
      status: 500, headers: { 'content-type': 'application/problem+json' },
    })
    : new Response(null, { status: 204 }))
  await user.click(await screen.findByRole('button', { name: 'Delete account' }))
  await user.type(screen.getByLabelText('Type your email to confirm'), profile.email)
  const confirm = screen.getByRole('button', { name: 'Permanently delete account' })
  await user.click(confirm)
  expect(await screen.findByRole('alert')).toHaveTextContent('Try again later.')
  expect(screen.getByLabelText('Type your email to confirm')).toHaveValue(profile.email)
  expect(readSession().session).not.toBeNull()
  await user.click(confirm)
  expect(await screen.findByText('Your account has been deleted.')).toBeVisible()
})


it('locks read controls and returns to page one when the last unread page disappears', async () => {
  let unread = 21
  let complete: (response: Response) => void = () => {}
  const response = new Promise<Response>(resolve => { complete = resolve })
  const { user, fetchMock } = mount('/notifications', (url, init) => {
    if (init?.method === 'POST') return response
    const page = Number(url.searchParams.get('page'))
    const item = { id: 'one', subscriptionId: 'sub', kind: 'RENEWAL', alertType: 'ONE_DAY',
      message: 'Billing soon', billingDate: '2026-01-02', createdAt: '2026-01-01T00:00:00Z', readAt: null }
    return Response.json({ items: page === 0 || unread === 21 ? [item] : [], page, size: 20,
      totalElements: unread, totalPages: Math.ceil(unread / 20) })
  }, () => unread)
  await user.click(await screen.findByRole('button', { name: 'Unread' }))
  await user.click(await screen.findByRole('button', { name: 'Next' }))
  expect(await screen.findByText('Page 2 of 2')).toBeVisible()
  const single = screen.getByRole('button', { name: 'Mark as read' })
  await user.dblClick(single)
  expect(single).toBeDisabled()
  expect(screen.getByRole('button', { name: 'Mark all as read' })).toBeDisabled()
  expect(fetchMock.mock.calls.filter(([, init]) => init?.method === 'POST')).toHaveLength(1)
  unread = 20
  complete(Response.json({ id: 'one' }))
  expect(await screen.findByText('Page 1 of 1')).toBeVisible()
})
