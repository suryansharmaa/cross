import { animate, motion, useInView, useMotionValue, useTransform } from 'framer-motion'
import { useEffect, useRef } from 'react'
import { EASE_OUT, useMotionEnabled } from '../../lib/motion'
import { formatINR } from '../../lib/subscriptionFormatting'
import { formatPreviewINR } from './previewData'
import styles from './Landing.module.css'

export default function AnimatedRupee({ amount, visible, startAt = 0, duration = .85, decimals = 0, replay = true, delay = 0 }: {
  amount: number
  visible?: boolean
  startAt?: number
  duration?: number
  decimals?: 0 | 2
  replay?: boolean
  delay?: number
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const enabled = useMotionEnabled()
  const observe = enabled && replay && visible === undefined && typeof IntersectionObserver !== 'undefined'
  const inView = useInView(ref, { once: false, amount: .25 })
  const ready = visible ?? (!observe || inView)
  const value = useMotionValue(startAt)
  const format = decimals === 2 ? formatINR : formatPreviewINR
  const display = useTransform(value, format)
  const target = format(amount)

  useEffect(() => {
    if (!enabled) {
      value.jump(amount)
      return
    }
    if (!ready) {
      if (replay) value.jump(startAt)
      return
    }
    const animation = animate(value, amount, { duration, delay, ease: EASE_OUT })
    return () => animation.stop()
  }, [enabled, ready, value, amount, duration, delay, replay, startAt])

  if (!enabled) return <span>{target}</span>
  return <span ref={observe ? ref : undefined} className={styles.count} data-final={target}>
    <span className={styles.visuallyHidden}>{target}</span>
    <motion.span aria-hidden="true">{display}</motion.span>
  </span>
}
