import { QueryClient } from '@tanstack/react-query'
import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import App from '../../App'
import { storeSession } from '../auth/session'

const path = '/api/v1/subscriptions'
const body = { name: '<b>Plan</b>', category: 'OTHER', amount: 120, billingCycle: 'MONTHLY',
  startDate: '2024-02-29', isTrial: true, trialEndDate: '2024-03-01', notes: '<em>Notes</em>' }
const item = { ...body, id: 'one', status: 'ACTIVE', nextBillingDate: '2024-03-01' }
const cancelled = { ...item, status: 'CANCELLED', nextBillingDate: null }
const page = (items: unknown[], number = 0, total = items.length) =>
  Response.json({ items, page: number, size: 20, totalPages: Math.ceil(total / 20), totalElements: total })
const problem = (status: number, code: string, fieldErrors?: { field: string; message: string }[]) =>
  Response.json({ code, detail: 'Server error', fieldErrors }, { status, headers: { 'Content-Type': 'application/problem+json' } })

function mount(route: string, respond: (url: URL, init?: RequestInit) => Response | Promise<Response>) {
  window.history.replaceState(null, '', route)
  storeSession({ accessToken: 'example', expiresAt: '2099-01-01T00:00:00Z' })
  vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8080')
  const fetchMock = vi.fn<typeof fetch>(async (input, init) => {
    const url = new URL(String(input))
    return url.pathname.endsWith('/users/me') ? Response.json({ id: 'account', email: 'person@example.test' }) : respond(url, init)
  })
  vi.stubGlobal('fetch', fetchMock)
  const client = new QueryClient()
  const view = render(<App client={client} />)
  return { ...view, fetchMock, client, user: userEvent.setup() }
}

it('renders text and status badges and confirms cancel and delete before refreshing', async () => {
  let items: (typeof item | typeof cancelled)[] = [item, { ...item, id: 'two', name: 'Regular', isTrial: false }]
  const { user, container } = mount('/', (url, init) => {
    if (url.pathname.endsWith('/cancel')) {
      items = items.map(entry => entry.id === 'one' ? cancelled : entry)
      return Response.json(cancelled)
    }
    if (init?.method === 'DELETE') {
      items = items.filter(entry => entry.id !== 'one')
      return new Response(null, { status: 204 })
    }
    return page(items)
  })
  const name = await screen.findByRole('heading', { name: body.name })
  expect(container.querySelector('h2 b, li em')).toBeNull()
  expect(screen.getAllByText(body.notes)).toHaveLength(2)
  const card = name.closest('li')
  if (!card) throw new Error('Missing card')
  expect(within(card).getByText('Trial')).toBeVisible()
  expect(screen.getByText('Active', { selector: 'li span' })).toBeVisible()
  const cancel = within(card).getByRole('button', { name: 'Cancel' })
  await user.click(cancel)
  expect(screen.getByRole('button', { name: 'Go back' })).toHaveFocus()
  await user.keyboard('{Escape}')
  expect(cancel).toHaveFocus()
  await user.click(cancel)
  await user.click(screen.getByRole('button', { name: 'Confirm cancel' }))
  expect(await within(card).findByText('Cancelled')).toBeVisible()
  expect(within(card).queryByRole('link', { name: 'Edit' })).toBeNull()
  await user.click(within(card).getByRole('button', { name: 'Delete' }))
  await user.click(screen.getByRole('button', { name: 'Confirm delete' }))
  expect(await screen.findByText('Subscription deleted.')).toHaveAttribute('role', 'status')
  expect(await screen.findByText('Page 1 of 1 (1 total)')).toBeVisible()
})

it('handles loading, retry, pagination and filtered empty results', async () => {
  let attempt = 0
  const { user } = mount('/subscriptions', url => {
    if (++attempt === 1) return problem(500, 'internal_error')
    if (url.searchParams.has('status')) return page([])
    return url.searchParams.get('page') === '1' ? page([item], 1, 21) : page([item], 0, 21)
  })
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not load subscriptions.')
  await user.click(screen.getByRole('button', { name: 'Retry' }))
  expect(await screen.findByText('Page 1 of 2 (21 total)')).toBeVisible()
  await user.click(screen.getByRole('button', { name: 'Next' }))
  expect(await screen.findByText('Page 2 of 2 (21 total)')).toBeVisible()
  await user.click(screen.getByRole('button', { name: 'Cancelled' }))
  expect(await screen.findByText('No subscriptions match this filter.')).toBeVisible()
  expect(screen.getByRole('button', { name: 'Cancelled' })).toHaveAttribute('aria-pressed', 'true')
})

it('prepopulates edit, clears trial end, and redirects after a full PUT', async () => {
  let finish: (response: Response) => void = () => {}
  const deferred = new Promise<Response>(resolve => { finish = resolve })
  const { user, fetchMock } = mount('/subscriptions/one/edit', (url, init) => {
    if (init?.method === 'PUT') return deferred
    return url.pathname === path ? page([]) : Response.json(item)
  })
  expect(await screen.findByLabelText('Name')).toHaveValue(body.name)
  expect(screen.getByLabelText('Trial end date')).toHaveValue(body.trialEndDate)
  await user.click(screen.getByLabelText('Trial'))
  expect(screen.queryByLabelText('Trial end date')).toBeNull()
  const save = screen.getByRole('button', { name: 'Save subscription' })
  await user.click(save)
  expect(save).toBeDisabled()
  const put = fetchMock.mock.calls.find(([, init]) => init?.method === 'PUT')
  expect(JSON.parse(String(put?.[1]?.body))).toEqual({ ...body, isTrial: false, trialEndDate: null })
  finish(Response.json(item))
  expect(await screen.findByText('Subscription updated.')).toBeVisible()
  expect(await screen.findByText(/No subscriptions yet/)).toBeVisible()
})

it.each(['cancelled', 'missing'])('guards a %s edit', async state => {
  mount('/subscriptions/one/edit', () => state === 'cancelled' ? Response.json(cancelled) : problem(404, 'subscription_not_found'))
  expect(await screen.findByRole('heading', { name: state === 'cancelled' ? 'Cancelled subscription' : 'Subscription not found' })).toBeVisible()
  expect(screen.queryByLabelText('Name')).toBeNull()
  expect(screen.getByRole('link', { name: 'Back to subscriptions' })).toBeVisible()
})

it('validates create inline and handles server validation and the cap', async () => {
  let writes = 0
  const { user } = mount('/subscriptions/new', () => ++writes === 1
    ? problem(400, 'validation_failed', [{ field: 'name', message: 'Server name error' }])
    : problem(409, 'subscription_limit_exceeded'))
  const save = await screen.findByRole('button', { name: 'Save subscription' })
  await user.click(save)
  expect(screen.getByLabelText('Name')).toHaveFocus()
  expect(writes).toBe(0)
  await user.type(screen.getByLabelText('Name'), 'Plan')
  await user.selectOptions(screen.getByLabelText('Category'), 'OTHER')
  await user.type(screen.getByLabelText('Amount (INR)'), '12.50')
  await user.selectOptions(screen.getByLabelText('Billing cycle'), 'MONTHLY')
  fireEvent.change(screen.getByLabelText('Start date'), { target: { value: '2024-02-29' } })
  await user.click(save)
  expect(await screen.findByText('Server name error')).toBeVisible()
  expect(screen.getByLabelText('Name')).toHaveAccessibleDescription('Server name error')
  await user.click(save)
  expect(await screen.findByRole('alert')).toHaveTextContent('limit of 100 subscriptions')
})

it('reloads the latest subscription after an optimistic locking conflict', async () => {
  let reads = 0
  const { user } = mount('/subscriptions/one/edit', (_, init) => init?.method === 'PUT'
    ? problem(409, 'optimistic_lock_conflict')
    : Response.json({ ...item, name: ++reads === 1 ? body.name : 'Latest name' }))
  const name = await screen.findByLabelText('Name')
  await user.clear(name)
  await user.type(name, 'My draft')
  await user.click(screen.getByRole('button', { name: 'Save subscription' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('This subscription changed')
  expect(name).toHaveValue('My draft')
  await user.click(screen.getByRole('button', { name: 'Reload subscription' }))
  expect(await screen.findByDisplayValue('Latest name')).toBeVisible()
})

it.each(['created', 'expired'])('handles a %s create response', async outcome => {
  const { user, client, fetchMock } = mount('/subscriptions/new', (_, init) => init?.method === 'POST'
    ? outcome === 'created' ? Response.json(item, { status: 201 }) : problem(401, 'invalid_credentials')
    : page([item]))
  const listKey = ['subscriptions', 'account', 'list', 'all', 0, 20]
  client.setQueryData(listKey, { items: [], page: 0, size: 20, totalElements: 0, totalPages: 0 })
  await user.type(await screen.findByLabelText('Name'), 'Plan')
  await user.selectOptions(screen.getByLabelText('Category'), 'OTHER')
  await user.selectOptions(screen.getByLabelText('Billing cycle'), 'MONTHLY')
  await user.type(screen.getByLabelText('Amount (INR)'), '120')
  fireEvent.change(screen.getByLabelText('Start date'), { target: { value: '2024-02-29' } })
  await user.click(screen.getByRole('button', { name: 'Save subscription' }))
  if (outcome === 'created') {
    expect(await screen.findByText('Subscription added.')).toHaveAttribute('role', 'status')
    expect(await screen.findByRole('heading', { name: body.name })).toBeVisible()
  } else {
    expect(await screen.findByText('Your session expired. Please log in again.')).toBeVisible()
    expect(fetchMock.mock.calls.filter(([, init]) => init?.method === 'POST')).toHaveLength(1)
    expect(client.getQueryState(listKey)).toBeUndefined()
  }
})

it('redirects a protected list 401 and clears account query data', async () => {
  const { client, fetchMock } = mount('/subscriptions', () => problem(401, 'invalid_credentials'))
  expect(await screen.findByText('Your session expired. Please log in again.')).toBeVisible()
  expect(fetchMock).toHaveBeenCalledTimes(2)
  expect(client.getQueriesData({ queryKey: ['subscriptions'] })).toEqual([])
})
