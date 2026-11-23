import { useEffect, useState } from 'react'

export const landingSections = [
  { id: 'overview', label: 'Overview' },
  { id: 'reminders', label: 'Reminders' },
  { id: 'spending', label: 'Spending' },
  { id: 'contact', label: 'Contact' },
] as const

type LandingSection = typeof landingSections[number]['id']

export function useLandingSection() {
  const [active, setActive] = useState<LandingSection>('overview')

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return
    const sections = landingSections.map(({ id }) => ({ id, element: document.getElementById(id) }))
    const update = () => {
      let next: LandingSection = 'overview'
      if (window.scrollY > 0) {
        for (const { id, element } of sections) {
          if (!element) continue
          const rect = element.getBoundingClientRect()
          if (rect.top <= window.innerHeight * .4 || (id === 'contact' && rect.bottom <= window.innerHeight + 1)) {
            next = id
          }
        }
      }
      setActive(next)
    }
    const observer = new IntersectionObserver(update, {
      threshold: [0, .1, .2, .35, .5, .65, .8, 1],
    })
    for (const { element } of sections) if (element) observer.observe(element)
    update()
    return () => observer.disconnect()
  }, [])

  return [active, setActive] as const
}
