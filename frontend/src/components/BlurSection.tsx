import { motion, useMotionTemplate, useScroll, useTransform } from 'framer-motion'
import { useRef } from 'react'
import type { ReactNode } from 'react'
import { useMotionEnabled } from '../lib/motion'
import styles from './BlurSection.module.css'

export default function BlurSection({ children, className, id }: { children: ReactNode; className?: string; id?: string }) {
  const ref = useRef<HTMLElement>(null)
  const enabled = useMotionEnabled()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const points = [0, .22, .78, 1]
  const blur = useTransform(scrollYProgress, points, [10, 0, 0, 8])
  const opacity = useTransform(scrollYProgress, points, [.2, 1, 1, .25])
  const y = useTransform(scrollYProgress, points, [36, 0, 0, -24])
  const filter = useMotionTemplate`blur(${blur}px)`

  return <section id={id} ref={ref}>
    <motion.div className={[className, enabled && styles.animated].filter(Boolean).join(' ')}
      style={enabled ? { y, opacity, filter } : undefined}>{children}</motion.div>
  </section>
}
