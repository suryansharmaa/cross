import { motion, useMotionTemplate, useScroll, useTransform } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useMotionEnabled } from '../lib/motion'
import styles from './ContainerScroll.module.css'

export default function ContainerScroll({ titleComponent, children }: { titleComponent: ReactNode; children: ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const enabled = useMotionEnabled()
  const [mobile, setMobile] = useState(false)

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return
    const query = window.matchMedia('(max-width: 768px)')
    const sync = () => setMobile(query.matches)
    sync()
    query.addEventListener('change', sync)
    return () => query.removeEventListener('change', sync)
  }, [])

  const { scrollYProgress } = useScroll({ target: containerRef, offset: ['start start', 'start -55vh'] })
  const titleY = useTransform(scrollYProgress, [0, .55], [0, -56])
  const titleOpacity = useTransform(scrollYProgress, [0, .55], [1, .08])
  const headerBlur = useTransform(scrollYProgress, [0, .55], [0, 8])
  const titleFilter = useMotionTemplate`blur(${headerBlur}px)`
  const rotateX = useTransform(scrollYProgress, [0, .6], [mobile ? 8 : 16, 0])
  const scale = useTransform(scrollYProgress, [0, .6], [mobile ? .97 : .96, 1])
  const cardY = useTransform(scrollYProgress, [0, .6], [mobile ? 16 : 36, 0])
  const cardOpacity = useTransform(scrollYProgress, [0, .35], [.82, 1])
  const cardBlur = useTransform(scrollYProgress, [0, .4], [mobile ? 2 : 3, 0])
  const cardFilter = useMotionTemplate`blur(${cardBlur}px)`

  return <div className={styles.container} ref={containerRef}>
    <motion.div className={styles.title} style={enabled ? { y: titleY, opacity: titleOpacity, filter: titleFilter } : undefined}>{titleComponent}</motion.div>
    <div className={styles.perspective}>
      <motion.div className={styles.bezel}
        style={enabled ? { rotateX, scale, y: cardY, opacity: cardOpacity, filter: cardFilter } : undefined}>
        <div className={styles.surface}>{children}</div>
      </motion.div>
    </div>
  </div>
}
