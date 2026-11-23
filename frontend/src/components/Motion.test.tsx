import { render, screen, waitFor } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { ListTransition } from './Motion'

vi.mock('../lib/motion', async importOriginal => ({
  ...await importOriginal<typeof import('../lib/motion')>(),
  useMotionEnabled: () => true,
}))

it('makes the outgoing list inert and waits before mounting the next filter', async () => {
  const { rerender } = render(<ListTransition listKey="all:0" ready className="list">
    <li>All plans</li>
  </ListTransition>)

  rerender(<ListTransition listKey="active:0" ready className="list">
    <li>Active plans</li>
  </ListTransition>)

  expect(screen.getByText('All plans').closest('ul')).toHaveAttribute('inert')
  expect(screen.queryByText('Active plans')).not.toBeInTheDocument()
  await waitFor(() => expect(screen.getByText('Active plans')).toBeVisible())
  expect(screen.queryByText('All plans')).not.toBeInTheDocument()
})
