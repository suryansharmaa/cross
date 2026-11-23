import { EASE_OUT } from '../../lib/motion'

export const replayViewport = { once: false, amount: .22 } as const
export const bellWiggle = { rotate: [0, -12, 10, -6, 0], transition: { duration: .5, ease: EASE_OUT } }
