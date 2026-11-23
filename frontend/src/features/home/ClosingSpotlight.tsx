import { motion, useMotionTemplate, useMotionValue } from 'framer-motion'
import type { MouseEvent, ReactNode } from 'react'
import { useMotionEnabled } from '../../lib/motion'
import styles from './Landing.module.css'

export default function ClosingSpotlight({ children }: { children: ReactNode }) {
  const enabled = useMotionEnabled()
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  const background = useMotionTemplate`radial-gradient(380px circle at ${mouseX}px ${mouseY}px, rgba(255, 255, 255, .08), transparent 75%)`

  function move(event: MouseEvent<HTMLDivElement>) {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return
    const bounds = event.currentTarget.getBoundingClientRect()
    mouseX.set(event.clientX - bounds.left)
    mouseY.set(event.clientY - bounds.top)
  }

  return <div className={styles.close} onMouseMove={enabled ? move : undefined}>
    {enabled && <motion.div className={styles.spotlight} aria-hidden="true" style={{ background }} />}
    {children}
  </div>
}
