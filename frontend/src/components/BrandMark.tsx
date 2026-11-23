import { motion } from 'framer-motion'
import { SPRING_SNAPPY, useMotionEnabled } from '../lib/motion'
import styles from './BrandMark.module.css'

export default function BrandMark() {
  const enabled = useMotionEnabled()
  return <motion.span className={styles.lockup} whileHover={enabled ? { scale: 1.04 } : undefined}
    transition={SPRING_SNAPPY}>
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
      <rect width="24" height="24" rx="0" fill="#1D1D1F" />
      <line x1="12" y1="5" x2="12" y2="19" stroke="#FFFFFF" strokeWidth="1.35" strokeLinecap="butt" />
      <line x1="6" y1="8.5" x2="18" y2="15.5" stroke="#FFFFFF" strokeWidth="1.35" strokeLinecap="butt" />
      <line x1="18" y1="8.5" x2="6" y2="15.5" stroke="#FFFFFF" strokeWidth="1.35" strokeLinecap="butt" />
    </svg>
    <span>Cross</span>
  </motion.span>
}
