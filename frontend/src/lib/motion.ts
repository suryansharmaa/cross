import { useReducedMotion } from 'framer-motion'

export const EASE_OUT = [0.22, 1, 0.36, 1] as const
export const SPRING_SNAPPY = { type: 'spring', stiffness: 420, damping: 32, mass: 0.8 } as const

export function useMotionEnabled() {
  const reduced = useReducedMotion()
  return !reduced && typeof window !== 'undefined' && typeof window.matchMedia === 'function'
}

