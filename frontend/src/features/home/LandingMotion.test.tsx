import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { useMotionEnabled } from '../../lib/motion'
import AnimatedRupee from './AnimatedRupee'
import SpendPreview from './SpendPreview'

vi.mock('../../lib/motion', async importOriginal => ({
  ...await importOriginal<typeof import('../../lib/motion')>(),
  useMotionEnabled: vi.fn(),
}))

it('counts up in INR and resets when its observed amount leaves view', async () => {
  vi.mocked(useMotionEnabled).mockReturnValue(true)
  let notify = (_entries: Array<{ target: Element; isIntersecting: boolean }>) => {}
  vi.stubGlobal('IntersectionObserver', class {
    constructor(callback: typeof notify) { notify = callback }
    observe() {}
    disconnect() {}
  })
  const { container } = render(<AnimatedRupee amount={123456.78} decimals={2} duration={.03} />)
  const target = container.firstElementChild
  if (!target) throw new Error('Missing observed amount')
  const display = target.querySelector('[aria-hidden]')
  expect(display).toHaveTextContent('\u20b90.00')

  for (let entry = 0; entry < 2; entry += 1) {
    act(() => notify([{ target, isIntersecting: true }]))
    await waitFor(() => expect(display).toHaveTextContent('\u20b91,23,456.78'))
    act(() => notify([{ target, isIntersecting: false }]))
    await waitFor(() => expect(display).toHaveTextContent('\u20b90.00'))
  }
})

it('cross-highlights spending rows and segments with final prices under reduced motion', () => {
  vi.mocked(useMotionEnabled).mockReturnValue(false)
  render(<SpendPreview />)
  const row = screen.getByText('Entertainment').closest('li')
  const segment = document.querySelector('[data-category="ENTERTAINMENT"]')
  const otherSegment = document.querySelector('[data-category="MUSIC"]')
  if (!row || !segment || !otherSegment) throw new Error('Missing category breakdown')

  expect(within(row).getByText('\u20b9799')).toBeVisible()
  fireEvent.pointerEnter(row)
  expect(otherSegment.firstElementChild).toHaveAttribute('data-dimmed', 'true')
  fireEvent.pointerLeave(row)
  expect(otherSegment.firstElementChild).not.toHaveAttribute('data-dimmed')
  fireEvent.pointerEnter(segment)
  expect(row).toHaveAttribute('data-highlighted', 'true')
})
