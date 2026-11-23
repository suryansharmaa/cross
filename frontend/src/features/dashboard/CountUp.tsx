import { animate, motion, useMotionValue, useTransform } from 'framer-motion'
import { useEffect } from 'react'
import { EASE_OUT } from '../../lib/motion'
import styles from './Dashboard.module.css'

export default function CountUp({
  value, format, enabled, duration = .85, delay = 0,
}: {
  value: number
  format: (value: number) => string
  enabled: boolean
  duration?: number
  delay?: number
}) {
  const count = useMotionValue(0)
  const display = useTransform(count, format)
  useEffect(() => {
    if (!enabled) {
      count.jump(value)
      return
    }
    const animation = animate(count, value, { duration, delay, ease: EASE_OUT })
    return () => animation.stop()
  }, [count, delay, duration, enabled, value])

  if (!enabled) return format(value)
  return <span className={styles.count}>
    <span>{format(value)}</span>
    <motion.span aria-hidden="true">{display}</motion.span>
  </span>
}
